import {
  Enemy,
  Projectile,
  Particle,
  DamageNumber,
  LootItem,
  PlayerStats,
  Spell,
  GameQuest,
  ArenaRealm,
  CharacterHero,
} from '../types/game';
import { Q, profMark } from './ArtKit';
import { GFX } from './gfxSettings';
import { InteractiveBg, IBG } from './interactiveBg';
import { BOSS_TEST_TIME_SECONDS, BOSS_TEST_KILLS, BOSS_TEST_ENEMIES_LEFT } from './constants';
import { sound } from '../audio/soundEngine';
import { VisualRenderer } from './Visuals';
import { FX } from './FX';
import { drawGlow } from './ArtKit';
import { WeatherSystem } from './WeatherSystem';
import { ARENAS_LIST, ArenaRenderer, OBELISK_POSITIONS, arenaTheme } from './arenas';
import { HEROES_LIST } from './characters';
import { BASE_SPELLS, BASE_SPELL_IDS, MAX_MAGIC_SLOTS, PASSIVES, UpgradeChoice, applySpellLevel, makeComboSpell, makeSpell, spellEffectText } from './spells';
import { COMBO_MAGIC_RECIPES, canFormCombo } from './combos';
import { ENEMY_DEFS, NEW_ENEMY_TYPES, REGION_PACKS, ELITE_AURA } from './enemies';
import { SPIRIT, spiritRole, ascension, spiritBuffs, spiritUnlockText, ROLE_COLOR, SpiritRole } from './spiritRoles';
import { renderNewEnemy, renderEliteAura, renderShot, renderSpirit, hasNewArt } from './EnemyArt';
import { SCENES, SceneKind, renderScene, makeCracks, renderCracks } from './cataclysm';
import { WorldGround, REBASE_AT, CHUNK } from './world';
import { RARITY_WEIGHT } from './deep';
import { Magic2 } from './magic2';
import { SPELL2_BY_ID } from './spells2';
import { EL_RGB } from './elements';
import { ARTIFACTS, ELEMENT_OF, ENDLESS_BOSS_EVERY, EVOLUTIONS, REGIONS, SYNERGIES, SYNERGY_MIN_LEVEL, artifactById, endlessScale, evoUnlockLevel, loadBest, saveBest, Element } from './deep';

export type GameMode = 'regions' | 'endless';
interface Zone { x: number; y: number; r: number; t: number; max: number; dps: number; color: string; tick: number; steam?: boolean }
interface EShot { x: number; y: number; vx: number; vy: number; dmg: number; color: string; ground: boolean; slow?: boolean; life: number; r: number; src: string }
interface SpiritUnit { x: number; y: number; z: number; dash: number; tx: number; ty: number; target: Enemy | null; dmg: number; role?: SpiritRole; hcd?: number }
interface Label { text: string; x: number; y: number; color: string; life: number; max: number; big: boolean }
interface Beam { x1: number; y1: number; x2: number; y2: number; color: string; life: number }
import { FLIGHT_LIFT, HOVER_SPEED, SOAR_SPEED, HOVER_DMG, SOAR_DMG, SOAR_H, WORLD_MUL, CATA_CD, CATA_SCENE, CHARGE_MAX, FUSION_WINDOW, FUSION_CD, FUSIONS, CATA_GAIN, ELITE_EVERY, ELITE_RANDOM_CHANCE, ELITE_HP, ELITE_DMG, PACK_EVERY_ENDLESS, PACK_EVERY_REGION } from './tuning';
export { FLIGHT_LIFT, HOVER_SPEED, SOAR_SPEED, HOVER_DMG, SOAR_DMG, SOAR_H, WORLD_MUL, CATA_CD, CATA_SCENE, CHARGE_MAX, FUSION_WINDOW, FUSION_CD };
export const FUSION_TABLE = FUSIONS;
/** In-place stable compaction (no new array, no splice shifting). */
export function compact<T>(a: T[], keep: (x: T) => boolean) { let j = 0; for (let i = 0; i < a.length; i++) { const x = a[i]; if (keep(x)) a[j++] = x; } a.length = j; }
interface Hazard { x: number; y: number; r: number; t: number; dmg: number; color: string; slow?: boolean; air?: boolean }

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onQuestUpdate: (updater: (prev: GameQuest[]) => GameQuest[]) => void;
  onWaveUpdate: (wave: number, enemiesLeft: number, timeStr: string) => void;
  onLevelUp: (newLevel: number) => void;
  onGameOver: (victory: boolean, stats: RunSummary) => void;
  onBossState: (boss: Enemy | null) => void;
  onRadarUpdate: (data: RadarData) => void;
  onWeatherChange?: (weatherTitle: string) => void;
  onSurvivalMilestone?: (timeStr: string, wave: number, demons: number) => void;
  onSpellsUpdate?: (spells: Spell[]) => void;
  onComboUnlocked?: (comboName: string) => void;
  onChest?: (title: string, sub: string, choices: UpgradeChoice[]) => void;
}

export interface RadarData {
  playerX: number;
  playerY: number;
  arenaRadius: number;
  worldX?: number; worldY?: number; spawnX?: number; spawnY?: number;
  enemies: { x: number; y: number; isBoss?: boolean }[];
  crystals: { x: number; y: number }[];
}

export interface RunSummary {
  survivalTime: string;
  enemiesDefeated: number;
  crystalsCollected: number;
  goldEarned: number;
  waveReached: number;
  levelReached: number;
  damageDealt: number;
  mode?: GameMode;
  regionReached?: number;
  regionName?: string;
  endlessTime?: string;
  score?: number;
  newBest?: boolean;
  bestText?: string;
}

const IBG_EL_COLOR: Record<string, string> = { fire: '#fb923c', ice: '#7dd3fc', lightning: '#fde047', arcane: '#c084fc', spirit: '#5eead4' };

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Background Arena Texture

  // World and Camera
  private arenaRadius: number = 880;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private screenShake: number = 0;

  // Realm & Hero
  public currentArena: ArenaRealm = ARENAS_LIST[0];
  public currentHero: CharacterHero = HEROES_LIST[0];

  // Player state
  public playerX: number = 0;
  public playerY: number = 0;
  public playerAngle: number = 0;
  /** Smoothed facing angle from last non-zero movement (drives 8-way sprite facing). */
  public faceAngle: number = Math.PI / 2;
  public moveAmt: number = 0;
  public stats: PlayerStats;
  public spells: Spell[];

  // Game Entities
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private damageNumbers: DamageNumber[] = [];
  private lootItems: LootItem[] = [];

  // Boss
  private currentBoss: Enemy | null = null;

  // Wave & Progression
  private currentWave: number = 8;
  private maxWaves: number = 20;
  private gameTimeSeconds: number = 0;
  private enemiesDefeated: number = 0;
  private crystalsCollected: number = 0;
  private totalDamageDealt: number = 0;
  private spawnTimer: number = 0;
  private targetEnemiesThisWave: number = 40;
  private centralSigilTimer: number = 0;
  private milestoneTriggered: boolean = false;

  // Settings
  public showDamageNumbers: boolean = true;
  public enableScreenShake: boolean = true;
  public enableHitStop: boolean = true;
  private viewHalfW = 1200; private viewHalfH = 900;
  private onScreen(x: number, y: number, m: number) { return Math.abs(x - this.cameraX) < this.viewHalfW + m && Math.abs(y - this.cameraY) < this.viewHalfH + m; }
  public autoAim: boolean = true;

  // Dynamic Weather Overlay System
  public weatherSystem: WeatherSystem = new WeatherSystem();

  // Input states
  private keys: { [key: string]: boolean } = {};
  private joystickVector: { x: number; y: number } = { x: 0, y: 0 };
  private mouseAim: { x: number; y: number } = { x: 0, y: 0 };

  private callbacks: GameEngineCallbacks;

  constructor(
    canvas: HTMLCanvasElement,
    initialStats: PlayerStats,
    initialSpells: Spell[],
    callbacks: GameEngineCallbacks,
    startWave: number = 8
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.stats = { ...initialStats };
    void initialSpells; // run starts with no magic: player picks one on the spell-select screen
    this.spells = [];
    this.callbacks = callbacks;

    this.currentWave = startWave;
    if (startWave === 1) {
      this.gameTimeSeconds = 0;
      this.enemiesDefeated = 0;
      this.targetEnemiesThisWave = 40;
    } else {
      this.gameTimeSeconds = BOSS_TEST_TIME_SECONDS;
      this.enemiesDefeated = BOSS_TEST_KILLS;
      this.targetEnemiesThisWave = BOSS_TEST_ENEMIES_LEFT;
      this.crystalsCollected = initialStats.crystals;
    }


    // Initialize atmospheric weather for starting wave
    this.weatherSystem.setWeatherForWave(this.currentWave);

    this.resizeCanvas();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('msd:tap', this.onTap as EventListener);

    this.seedInitialBattlefield();
  }

  private onResize = () => {
    this.resizeCanvas();
  };

  private resizeCanvas() {
    this.canvas.width = Math.round(window.innerWidth * this.renderScale);
    this.canvas.height = Math.round(window.innerHeight * this.renderScale);
  }
  /** Dynamic resolution: crowded LOD renders the backbuffer smaller; CSS upscales it. */
  public renderScale = 1;
  private applyRenderScale() {
    const rs = this.lod >= 2 ? 0.72 : this.lod === 1 ? 0.88 : 1;
    if (rs !== this.renderScale) { this.renderScale = rs; this.resizeCanvas(); }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.code === 'Space') {
      this.triggerDash();
    }
    if ((e.key === 'f' || e.key === 'F') && !e.repeat) this.toggleFlight();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseAim = {
      x: e.clientX - window.innerWidth / 2,
      y: e.clientY - window.innerHeight / 2,
    };
  };

  public setJoystickVector(vx: number, vy: number) {
    this.joystickVector = { x: vx, y: vy };
  }

  public triggerDash() {
    if (this.stats.dashCurrentCooldown <= 0 && !this.stats.isDashing) {
      this.stats.isDashing = true;
      this.stats.dashCurrentCooldown = this.stats.dashCooldown;
      sound.playDash();

      let dx = this.joystickVector.x;
      let dy = this.joystickVector.y;
      if (dx === 0 && dy === 0) {
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
      }
      if (dx === 0 && dy === 0) {
        dx = Math.cos(this.playerAngle);
        dy = Math.sin(this.playerAngle);
      }
      const len = Math.hypot(dx, dy) || 1;
      dx = (dx / len) * 230;
      dy = (dy / len) * 230;

      this.playerX += dx;
      this.playerY += dy;

      // Dash particles
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          x: this.playerX - dx * (i / 30) + (Math.random() - 0.5) * 35,
          y: this.playerY - dy * (i / 30) + (Math.random() - 0.5) * 35,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          size: Math.random() * 5 + 3,
          color: '#38bdf8',
          alpha: 1,
          life: 0.35,
          maxLife: 0.35,
          shape: 'spark',
        });
      }

      setTimeout(() => {
        this.stats.isDashing = false;
      }, this.stats.dashDuration * 1000);
    }
  }

  /** Number of Fast Casting stacks owned. */
  public fastCasting = 0;
  /** Global stagger gap between consecutive auto-casts (so multiple magics alternate). */
  private castGapTimer = 0;
  public castLog: { id: string; t: number }[] = [];
  public comboLog: string[] = [];

  // ---- deep systems ----
  public mode: GameMode = 'regions';
  public regionIdx = 0;
  public regionTime = 0;
  public regionPhase: 'fight' | 'boss' | 'cleared' = 'fight';
  public inEndless = false;
  public endlessTime = 0;
  private nextEndlessBoss = ENDLESS_BOSS_EVERY;
  public artifacts: Record<string, number> = {};
  public synergies: string[] = [];
  public notices: { text: string; color: string; kind: string }[] = [];
  public zones: Zone[] = [];
  public hazards: Hazard[] = [];
  private hazardTimer = 4;
  private slowUntil = 0;
  public revived = false;
  public bossKills = 0;
  public frameTimes: number[] = [];
  public chestLog: string[] = [];
  public despawned = 0;
  private amberT?: number;
  private spiritAuto = 1.5;
  public revives = 0;
  public MAX_PARTICLES = 450;
  // ---- v5: free flight (no meter / lockout). GROUND / HOVER (idle) / SOAR (moving) ----
  public flying = false;
  public flyH = 0;
  public flightLog: string[] = [];
  public zoomK = 1;
  private pullBack: { x0: number; y0: number; x1: number; y1: number; t: number } | null = null;
  public pullLog = 0;
  private stormTimer = 8;
  get airborne() { return this.flyH > 0.5; }
  /** Altitude state: not flying -> ground; flying + moving -> soar; flying + idle/slow -> hover. */
  get alt(): 'ground' | 'hover' | 'soar' { return !this.flying ? 'ground' : this.moveAmt > 0.3 ? 'soar' : 'hover'; }
  /** v7: the world is endless — no rim, no wall. Kept for API compatibility (Infinity). */
  get worldR() { return Infinity; }
  public world = new WorldGround();
  /** integer world offset of the local origin (multiple of CHUNK): absolute = local + origin */
  public origin = { x: 0, y: 0 };
  public rebaseCount = 0;
  private cataAt = { x: 0, y: 0 };
  /** off-screen spawn distance around the player (scales with view/zoom) */
  private offDist() { return Math.max(this.viewHalfW, this.viewHalfH) + 90; }
  public absPos() { return { x: this.playerX + this.origin.x, y: this.playerY + this.origin.y }; }
  /** Float precision: when the player wanders far, shift every position by a CHUNK multiple. */
  private rebase() {
    if (Math.abs(this.playerX) < REBASE_AT && Math.abs(this.playerY) < REBASE_AT) return;
    const dx = Math.round(this.playerX / CHUNK) * CHUNK, dy = Math.round(this.playerY / CHUNK) * CHUNK;
    this.origin.x += dx; this.origin.y += dy; this.rebaseCount++;
    this.playerX -= dx; this.playerY -= dy; this.cameraX -= dx; this.cameraY -= dy;
    this.cataAt.x -= dx; this.cataAt.y -= dy;
    const K = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'tx', 'ty', 'targetX', 'targetY', 'sx', 'sy', 'ox', 'oy', 'homeX', 'homeY', 'lx', 'ly'];
    const sh = (o: Record<string, unknown>) => { for (const k of K) if (typeof o[k] === 'number') (o as Record<string, number>)[k] -= (k.endsWith('y') || k.endsWith('Y') || k === 'y1' || k === 'y2') ? dy : dx; };
    const self = this as unknown as Record<string, unknown>;
    for (const key of Object.keys(self)) { const v = self[key]; if (!Array.isArray(v)) continue; for (const o of v) { if (!o || typeof o !== 'object' || Array.isArray(o)) continue; const r = o as Record<string, unknown>; if (typeof r.x === 'number' || typeof r.x1 === 'number') sh(r); } }
    for (const cr of this.cata.cracks) for (let i = 0; i < cr.length; i += 2) { cr[i] -= dx; cr[i + 1] -= dy; }
    if (this.charging) { /* no positions */ }
    FX.shift(dx, dy); this.ibg.shift(dx, dy); this.weatherSystem.shift(dx, dy); this.magic2Shift(dx, dy);
  }
  public toggleFlight(on?: boolean) {
    const want = on ?? !this.flying;
    if (want === this.flying) return this.flying;
    if (this.pullBack && want) return false;
    if (want) {
      this.flying = true; this.flightLog.push('takeoff'); sound.play('wings', 1);
      FX.ring(this.playerX, this.playerY, 90, 'rgba(180,230,255,1)', 0.4);
      if (this.art('gale_wings')) {
        FX.ring(this.playerX, this.playerY, 260, 'rgba(186,230,253,1)', 0.5); this.shake(8);
        for (const e of this.enemies) { if (e.isBoss) continue; const dx = e.x - this.playerX, dy = e.y - this.playerY, d = Math.hypot(dx, dy) || 1; if (d < 260) { e.x += (dx / d) * 140; e.y += (dy / d) * 140; this.damageEnemy(e, 60, '#bae6fd', 'arcane'); } }
        this.flightLog.push('gale');
      }
    } else { this.flying = false; this.flightLog.push('land'); FX.ring(this.playerX, this.playerY, 70, 'rgba(200,220,255,1)', 0.35); sound.play('dash', 0.7); }
    return this.flying;
  }
  public flightState() { return { flying: this.flying, h: this.flyH, alt: this.alt, airborne: this.airborne, zoom: this.zoomK, outside: false, endless: true, dist: Math.round(Math.hypot(this.playerX + this.origin.x, this.playerY + this.origin.y)), abs: this.absPos(), arenaR: this.arenaRadius, worldR: -1, pulling: !!this.pullBack, pulls: this.pullLog }; }
  private resetFlight() { this.flying = false; this.flyH = 0; }
  private updateFlight(dt: number) {
    const target = this.alt === 'soar' ? SOAR_H : this.alt === 'hover' ? 1 : 0;
    this.flyH += (target - this.flyH) * Math.min(1, dt * (this.flying ? 4 : 3.5));
    if (Math.abs(target - this.flyH) < 0.002) this.flyH = target;
    const zt = this.alt === 'soar' ? 0.87 : 1;
    this.zoomK += (zt - this.zoomK) * Math.min(1, dt * 2.2);
    if (this.flying && this.art('eye_of_storm')) {
      this.stormTimer -= dt;
      if (this.stormTimer <= 0) { this.stormTimer = 8; this.flightLog.push('storm'); const ts = [...this.enemies].sort((p, q) => Math.hypot(p.x - this.playerX, p.y - this.playerY) - Math.hypot(q.x - this.playerX, q.y - this.playerY)).slice(0, 6); for (const e of ts) { FX.bolt(e.x, e.y); this.damageEnemy(e, Math.round(140 * this.stats.spellPower / 100), '#fde047', 'lightning'); } sound.play('thunder', 1.2); }
    }
    // soar wing trail
    if (this.alt === 'soar' && this.moveAmt > 0.3 && this.particles.length < this.MAX_PARTICLES - 20) {
      const z = this.casterZ();
      for (const side of [-1, 1]) this.particles.push({ x: this.playerX + side * 26 - Math.cos(this.playerAngle) * 18, y: this.playerY - z - 30 - Math.sin(this.playerAngle) * 10, vx: -Math.cos(this.playerAngle) * 40, vy: -Math.sin(this.playerAngle) * 40, size: 3 + Math.random() * 2, color: '#e0f2fe', alpha: 0.8, life: 0.5, maxLife: 0.5, shape: 'spark' });
    }
  }
  private flightDmgMul() { return !this.airborne ? 1 : this.alt === 'soar' || this.flyH > 1.3 ? SOAR_DMG * (1 + 0.2 * this.art('sky_talon')) : HOVER_DMG; }
  /** v7: no confinement at all (ground or air). Only keeps float precision stable by rebasing the origin. */
  private applyBounds(_dt: number) { this.pullBack = null; this.rebase(); }
  /** v7: spawns are never clamped — the world is endless. */
  private clampSpawn(x: number, y: number) { return { x, y }; }
  /** Central player damage (iron skin). */
  private hurt(d: number) { this.stats.hp -= d * (1 - 0.1 * this.art('iron_skin')) * (1 - spiritBuffs(this.spirits.length).dr); }
  // ---- v5: cataclysm ----
  public cata = { meter: 0, phase: 'idle' as 'idle' | 'crack' | 'collapse' | 'scene' | 'reform', t: 0, kind: null as SceneKind | null, forced: null as SceneKind | null, left: 0, max: 0, cdUntil: 0, pending: false, cracks: [] as number[][], log: [] as string[], recent: [] as { k: string; t: number }[], gains: [] as string[], blocked: '' };
  public addCata(n: number, why: string) {
    const c = this.cata; if (c.phase !== 'idle') return;
    c.meter = Math.min(100, c.meter + n * (1 + 0.3 * this.art('storm_heart')));
    if (c.gains.length < 60) c.gains.push(`${why}+${Math.round(n)}`);
    if (c.meter >= 100 && !c.pending) { c.pending = true; this.notice('CATACLYSM READY — the ground trembles…', '#f43f5e', 'cataclysm'); }
  }
  private cataBlock(): string {
    if (this.currentBoss) return 'boss';
    if (!this.inEndless && this.regionPhase !== 'fight') return 'region-' + this.regionPhase;
    if (this.isPaused) return 'paused';
    if (this.gameTimeSeconds < this.cata.cdUntil) return 'cooldown';
    return '';
  }
  /** Debug/test hook: force a cataclysm into a given scene (ignores meter + cooldown, still blocked by boss/modals). */
  public triggerCataclysm(kind?: SceneKind) {
    if (this.cata.phase !== 'idle') return 'busy';
    const b = this.cataBlock(); if (b && b !== 'cooldown') return b;
    this.beginCataclysm(kind ?? null); return 'ok';
  }
  private beginCataclysm(kind: SceneKind | null) {
    const c = this.cata; c.phase = 'crack'; c.t = 0; c.forced = kind; c.pending = false; this.cataAt = { x: this.playerX, y: this.playerY }; c.cracks = makeCracks(this.arenaRadius, this.playerX, this.playerY); c.log.push('crack');
    sound.play('crack', 1.4); this.shake(14); FX.flash(this.playerX, this.playerY, 300, '#fecaca');
    this.notice('THE GROUND IS CRACKING!', '#f43f5e', 'cataclysm');
  }
  private sceneKindNow(): SceneKind { return !this.flying ? 'abyss' : this.alt === 'soar' ? 'sky' : 'rift'; }
  private updateCataclysm(dt: number) {
    const c = this.cata;
    if (c.phase === 'idle') { if (c.pending) { const b = this.cataBlock(); c.blocked = b; if (!b) this.beginCataclysm(null); } return; }
    c.t += dt;
    if (c.phase === 'crack') {
      if (Math.random() < dt * 8) this.shake(6 + 8 * c.t);
      if (c.t >= 2.2) {
        c.phase = 'collapse'; c.t = 0; c.kind = c.forced ?? this.sceneKindNow(); c.log.push('collapse:' + c.kind);
        sound.play('collapse', 1.6); this.shake(30); FX.flash(this.playerX, this.playerY, 600, '#ffffff');
        for (const e of this.enemies) if (!e.isBoss) FX.flash(e.x, e.y, 30, '#f43f5e');
        this.enemies = this.enemies.filter((e) => e.isBoss); this.enemyShots = []; this.hazards = []; this.zones = [];
        sound.stopAtmosphereMusic();
      }
    } else if (c.phase === 'collapse') {
      if (c.t >= 1.6) {
        const d = SCENES[c.kind!]; c.phase = 'scene'; c.t = 0; c.max = CATA_SCENE + 15 * this.art('cataclysm_shard'); c.left = c.max; c.log.push('scene:' + c.kind);
        this.notice(`${d.title} — ${d.name}`, d.color, 'cataclysm'); sound.startAmbience(c.kind); this.hazardTimer = 3;
        if (c.kind === 'rift') { const a = Math.random() * 6.28; const el = this.spawnEnemyAt('void_knight', this.playerX + Math.cos(a) * 420, this.playerY + Math.sin(a) * 420, { elite: true, hpMul: 3, force: true }); if (el) { el.name = 'Rift Sovereign'; el.radius *= 1.4; } c.log.push('sovereign'); }
        for (let i = 0; i < 10; i++) this.spawnSceneEnemy();
      }
    } else if (c.phase === 'scene') {
      c.left -= dt;
      if (c.left <= 0) {
        c.phase = 'reform'; c.t = 0; c.log.push('reward');
        const n = 1 + (this.art('cataclysm_shard') ? 1 : 0);
        for (let i = 0; i < n; i++) this.lootItems.push({ id: `chest_scene_${Math.random()}`, x: this.playerX + 70 + i * 60, y: this.playerY + 30, type: 'chest', value: 1, color: '#facc15', bobOffset: 0 });
        for (const e of this.enemies) if (!e.isBoss) FX.flash(e.x, e.y, 26, '#ffffff');
        this.enemies = this.enemies.filter((e) => e.isBoss); this.enemyShots = []; this.hazards = [];
        this.notice('THE GROUND RE-FORMS — a reward chest awaits', '#facc15', 'cataclysm'); sound.play('artifact', 1.2); sound.startAmbience(null);
      }
    } else if (c.phase === 'reform') {
      if (c.t >= 1.5) { c.phase = 'idle'; c.t = 0; c.kind = null; c.meter = 0; c.cdUntil = this.gameTimeSeconds + CATA_CD; c.log.push('reformed'); sound.startAtmosphereMusic(); }
    }
  }
  private spawnSceneEnemy() {
    const d = SCENES[this.cata.kind!]; let roll = Math.random(); let type = d.roster[0][0];
    for (const [t, w] of d.roster) { if (roll < w) { type = t; break; } roll -= w; }
    const a = Math.random() * 6.28, dist = 480 + Math.random() * 220;
    const p = this.clampSpawn(this.playerX + Math.cos(a) * dist, this.playerY + Math.sin(a) * dist);
    this.spawnEnemyAt(type, p.x, p.y);
  }
  /** Test probe: numeric effect of every artifact (used by qa/v5 to pass/fail each artifact). */
  public allArtifactIds() { return ARTIFACTS.map((a) => a.id); }
  public artifactProbe() {
    const e = (id: string) => { const sp = makeSpell(id as any, 1); const r = this.eff(sp); return [r.damage, r.area, r.count].map((v) => Math.round(v * 1000) / 1000); };
    this.syncSpirits();
    return {
      maxHp: this.stats.maxHp, speed: Math.round(this.stats.speed * 1000) / 1000, pickup: this.stats.pickupRadius,
      arcane: e('arcane_missiles'), frost: e('frost_nova'), thunder: e('thunderstorm'), meteor: e('cataclysm'), spirit: e('spirit'),
      cdArcane: this.cdMul('arcane_missiles'), cdSpirit: this.cdMul('spirit'), cdFrost: this.cdMul('frost_nova'),
      spirits: this.spirits.length, fusionCd: FUSION_CD - this.art('fusion_core'), fusionDmg: 1 + 0.25 * this.art('fusion_core'),
      chargeMax: this.chargeMax(), steam: 1 + 0.5 * this.art('thermal_coil'), regen: 8 + 3 * this.art('amber'),
      xp: 1 + 0.15 * this.art('scholar_lens'), gold: 1 + 0.3 * this.art('golden_idol'), hurt: 1 - 0.1 * this.art('iron_skin'),
      cata: 1 + 0.3 * this.art('storm_heart'), lives: this.art('phoenix') + this.art('second_heart'), fly: 1 + 0.12 * this.art('wing_feather'),
      soar: SOAR_DMG * (1 + 0.2 * this.art('sky_talon')), gale: this.art('gale_wings'), storm: this.art('eye_of_storm'), sceneLen: CATA_SCENE + 15 * this.art('cataclysm_shard'),
      vamp: 2 * this.art('vampire_fang'), crit: this.stats.critChance, slayer: this.art('slayer'), hourglass: this.cdMul('thunderstorm'),
    };
  }
  get inScene() { return this.cata.phase === 'scene'; }
  public cataclysmState() {
    const c = this.cata; const d = c.kind ? SCENES[c.kind] : null;
    return { feed: this.cataFeed.filter((f) => this.gameTimeSeconds - f.t < 4).slice(-3), meter: Math.round(c.meter), phase: c.phase, t: c.t, kind: c.kind, name: d?.name ?? '', title: d?.title ?? '', sub: d?.sub ?? '', color: d?.color ?? '#f43f5e', left: Math.max(0, c.left), max: c.max, cooldown: Math.max(0, c.cdUntil - this.gameTimeSeconds), pending: c.pending, blocked: c.blocked, log: c.log.slice(-20), gains: c.gains.slice(-20) };
  }
  /** World-space height of the caster (for spells raining down). */
  private casterZ() { return FLIGHT_LIFT * this.flyH; }
  // ---- v4: labels / beams / juice ----
  public labels: Label[] = [];
  public beams: Beam[] = [];
  private hitStop = 0;
  public label(text: string, x: number, y: number, color: string, big = false) {
    if (this.labels.length > 14) this.labels.shift();
    this.labels.push({ text, x, y, color, life: big ? 1.6 : 1.1, max: big ? 1.6 : 1.1, big });
  }
  private shake(n: number) { this.screenShake = Math.max(this.screenShake, n); }
  /** Sky strike visual from the flying mage to a ground point + impact flash. */
  private skyStrike(tx: number, ty: number, color: string) {
    if (this.flyH < 0.3) return;
    if (this.beams.length > 30) this.beams.shift();
    this.beams.push({ x1: this.playerX, y1: this.playerY - this.casterZ() - 40, x2: tx, y2: ty, color, life: 0.22 });
    FX.flash(tx, ty, 46, color);
  }
  // ---- v4: enemies ----
  public enemyShots: EShot[] = [];
  private packTimer = 18;
  private eliteTimer = 45;
  public spawnLog: string[] = [];
  // ---- v4: fusion / steam / charge / spirits ----
  private lastCast: { el: string; id: string; t: number } | null = null;
  private fusionCd = 0;
  /** Per-pair cooldowns (s left) and last cast time per element. */
  public pairCd: Record<string, number> = {};
  private lastByEl: Record<string, { id: string; t: number }> = {};
  public pairLog: { key: string; t: number; hits: number; fx: string }[] = [];
  public fusionLog: string[] = [];
  private charging: { id: string; t0: number } | null = null;
  public chargeLog: { id: string; k: number }[] = [];
  public spirits: SpiritUnit[] = [];
  public spiritLog = { strikes: 0, bolts: 0 };

  private notice(text: string, color: string, kind = 'info') {
    this.notices.push({ text, color, kind });
    if (this.notices.length > 8) this.notices.shift();
  }
  get region() { return REGIONS[this.inEndless ? Math.floor(this.endlessTime / ENDLESS_BOSS_EVERY) % REGIONS.length : Math.min(this.regionIdx, REGIONS.length - 1)]; }
  public art(id: string) { return this.artifacts[id] ?? 0; }

  /** Configure the run (called by App before start). */
  public setMode(mode: GameMode) {
    this.mode = mode;
    this.inEndless = mode === 'endless';
    this.regionIdx = 0;
    this.applyRegionArena();
  }
  public announceMode() {
    this.notice(this.mode === 'endless' ? 'ENDLESS SURVIVAL — how long can you last?' : `REGION 1: ${this.region.name}`, this.mode === 'endless' ? '#f43f5e' : this.region.color, 'region');
  }
  private applyRegionArena() {
    const a = ARENAS_LIST.find((x) => x.id === this.region.arena);
    if (a) { this.currentArena = a; this.weatherSystem.forceWeather(a.primaryWeather); }
  }

  /** Spell with evolution + artifact modifiers applied (used for every cast). */
  private eff(sp: Spell): Spell {
    const tier = sp.tier ?? 0;
    let dmg = 1, area = 1, count = 0;
    if (tier > 0 && EVOLUTIONS[sp.id]) { const e = EVOLUTIONS[sp.id][tier - 1]; dmg = e.dmg; area = e.area; count = e.count; }
    dmg *= (1 + 0.12 * this.art('crown')) * (this.art('archmage_tome') ? 1.25 : 1);
    area *= (1 + 0.15 * this.art('sigil')) * (this.art('archmage_tome') ? 1.1 : 1);
    count += this.art('prism');
    if (sp.id === 'thunderstorm') count += this.art('storm_rod');
    if (sp.id === 'frost_nova') area *= 1 + 0.2 * this.art('frost_ring');
    if (sp.id === 'cataclysm') dmg *= 1 + 0.15 * this.art('ember_seed');
    if (sp.id === 'arcane_missiles') count += this.art('whetstone');
    { const el2 = SPELL2_BY_ID[sp.id]?.el;
      if (el2 === 'poison') dmg *= 1 + 0.2 * this.art('venom_gland');
      if (el2 === 'wind') { area *= 1 + 0.12 * this.art('storm_vane'); count += this.art('storm_vane') >= 2 ? 1 : 0; }
      if (el2 === 'earth') dmg *= 1 + 0.18 * this.art('earth_core');
      if (el2 === 'water') area *= 1 + 0.18 * this.art('tide_pearl');
      if (el2 === 'light') { dmg *= 1 + 0.15 * this.art('halo'); count += this.art('halo') >= 3 ? 1 : 0; }
      if (el2 && this.art('elemental_codex')) dmg *= 1.2; }
    if (sp.id === 'spirit') dmg *= (this.art('twin_soul') ? 1.3 : 1) * SPIRIT.ASC_DMG[ascension(this.spirits.length)];
    dmg *= spiritBuffs(this.spirits.length).dmg;
    return { ...sp, damage: Math.round(sp.damage * dmg), area: Math.round(sp.area * area), count: sp.count + count };
  }

  public canEvolve(sp: Spell) {
    const t = sp.tier ?? 0;
    return !sp.isCombo && !!EVOLUTIONS[sp.id] && t < 2 && sp.level >= evoUnlockLevel(t);
  }
  public evolveSpell(id: string) {
    const sp = this.spells.find((s) => s.id === id);
    if (!sp || !this.canEvolve(sp)) return false;
    sp.tier = (sp.tier ?? 0) + 1;
    const e = EVOLUTIONS[id][sp.tier - 1];
    sp.name = e.name; sp.color = e.color; sp.evolutionName = e.name; sp.evolutionDesc = e.desc;
    applySpellLevel(sp);
    FX.star(this.playerX, this.playerY, 320);
    this.screenShake = 12;
    this.spawnFloatingText(`EVOLVED: ${e.name}!`, this.playerX, this.playerY - 80, e.color, true);
    this.notice(`${sp.tier === 2 ? 'FINAL FORM' : 'EVOLVED'}: ${e.name} — ${e.desc}`, e.color, 'evolve');
    this.emitSpells();
    return true;
  }
  private evolveChoices(): UpgradeChoice[] {
    return this.spells.filter((s) => this.canEvolve(s)).map((s) => {
      const t = (s.tier ?? 0) + 1; const e = EVOLUTIONS[s.id][t - 1];
      return { id: `evo:${s.id}`, kind: 'evolve', title: e.name, desc: e.desc, icon: s.icon, color: e.color, level: t };
    });
  }
  private artifactChoices(n: number): UpgradeChoice[] {
    // rarity-weighted draw without replacement; maxed artifacts are never offered
    const pool = ARTIFACTS.filter((a) => this.art(a.id) < a.max);
    const out: typeof pool = [];
    while (out.length < n && pool.length) {
      const tot = pool.reduce((s2, a) => s2 + RARITY_WEIGHT[a.rarity], 0); let r = Math.random() * tot; let i = 0;
      for (; i < pool.length - 1; i++) { r -= RARITY_WEIGHT[pool[i].rarity]; if (r <= 0) break; }
      out.push(pool.splice(i, 1)[0]);
    }
    return out.map((a) => { const l = this.art(a.id) + 1; return { id: `art:${a.id}`, kind: 'artifact', title: `${a.name}${a.max > 1 ? ` Lv ${l}` : ''}`, desc: a.desc(l), icon: a.icon, color: a.color, level: l, rarity: a.rarity }; });
  }
  public grantArtifact(id: string) {
    const a = artifactById(id);
    if (!a || this.art(id) >= a.max) return;
    this.artifacts[id] = this.art(id) + 1;
    const st = this.stats;
    if (id === 'eye') st.critChance += 8;
    else if (id === 'lodestone') st.pickupRadius += 60;
    else if (id === 'titan') { st.maxHp += 150; st.hp += 150; }
    else if (id === 'second_heart') { const add = Math.round(st.maxHp * 0.5); st.maxHp += add; st.hp += add; }
    else if (id === 'hermes') st.speed *= 1.1;
    else if (id === 'fusion_core') { const m = FUSION_CD - this.art('fusion_core'); for (const k in this.pairCd) this.pairCd[k] = Math.min(this.pairCd[k], m); }
    this.syncSpirits();
    sound.play('artifact', a.rarity === 'epic' ? 1.4 : 1);
    this.notice(`ARTIFACT: ${a.name} — ${a.desc(this.artifacts[id])}`, a.color, 'artifact');
    this.spawnFloatingText(a.name, this.playerX, this.playerY - 70, a.color, true);
    this.callbacks.onStatsUpdate({ ...this.stats });
  }
  /** Pause and offer a chest (evolutions first, then artifacts). */
  public openChest(title: string, sub = 'Choose a reward', boss = false) {
    // Treasure chests offer 3 artifacts; a boss reward is 'Select Attribute' (evolutions for fully grown magic) when one is available.
    const evo = boss ? this.evolveChoices() : [];
    const choices = evo.length ? [...evo, ...this.artifactChoices(3 - Math.min(2, evo.length))].slice(0, 3) : this.artifactChoices(3);
    if (evo.length) title = 'SELECT ATTRIBUTE';
    sound.play('chest', 1);
    this.chestLog.push(title);
    if (!choices.length) { this.addXp(this.stats.maxXp); return; }
    this.pause();
    this.callbacks.onChest?.(title, sub, choices);
  }
  private checkSynergies() {
    const lv: Partial<Record<Element, number>> = {};
    for (const s of this.spells) { const el = ELEMENT_OF[s.id]; if (el) lv[el] = s.level; }
    for (const sy of SYNERGIES) {
      if (this.synergies.includes(sy.id)) continue;
      if ((lv[sy.a] ?? 0) >= SYNERGY_MIN_LEVEL && (lv[sy.b] ?? 0) >= SYNERGY_MIN_LEVEL) {
        this.synergies.push(sy.id); this.addCata(CATA_GAIN.synergy, 'synergy');
        this.notice(`SYNERGY: ${sy.name} — ${sy.desc}`, sy.color, 'synergy');
        this.spawnFloatingText(`SYNERGY: ${sy.name}`, this.playerX, this.playerY - 90, sy.color, true);
        FX.ring(this.playerX, this.playerY, 200, 'rgba(255,255,255,1)', 0.6);
      }
    }
  }
  public hasSyn(id: string) { return this.synergies.includes(id); }
  private addZone(x: number, y: number, r: number, dur: number, dps: number, color: string) {
    if (this.zones.length >= 24) this.zones.shift();
    this.zones.push({ x, y, r, t: 0, max: dur, dps, color, tick: 0 });
  }
  public spawnBoss(name: string, hp: number) {
    const boss: Enemy = {
      id: `boss_${Math.random()}`, name, type: 'colossus_boss',
      x: this.playerX + 300, y: this.playerY - 220, vx: 0, vy: 0, radius: 65, hp, maxHp: hp,
      speed: 1.2, damage: 120, xpValue: 900, crystalDropChance: 1, goldValue: 1400,
      color: '#ef4444', glowColor: '#f97316', isBoss: true, attackCooldown: 3.5,
    };
    this.enemies.push(boss);
    this.currentBoss = boss;
    this.callbacks.onBossState(boss);
    this.notice(`BOSS: ${name}`, '#ef4444', 'boss');
    sound.playBossRoar();
  }
  /** Debug/test: jump to a region (0-based); bossNow spawns its boss immediately. */
  public skipToRegion(i: number, bossNow = false) {
    this.regionIdx = Math.max(0, Math.min(REGIONS.length - 1, i));
    this.inEndless = false; this.regionPhase = 'fight';
    this.regionTime = bossNow ? this.region.duration : 0;
    this.enemies = this.enemies.filter((e) => !e.isBoss); this.currentBoss = null; this.callbacks.onBossState(null); this.enemyShots = [];
    this.applyRegionArena();
    this.notice(`REGION ${this.regionIdx + 1}: ${this.region.name}`, this.region.color, 'region');
  }
  public startEndless() {
    this.inEndless = true; this.endlessTime = 0; this.nextEndlessBoss = ENDLESS_BOSS_EVERY;
    this.notice('ENDLESS SURVIVAL — how long can you last?', '#f43f5e', 'region');
  }
  private advanceRegion() {
    if (this.regionIdx >= REGIONS.length - 1) { this.startEndless(); return; }
    this.regionIdx++; this.regionTime = 0; this.regionPhase = 'fight';
    this.enemies = this.enemies.filter((e) => e.isBoss); this.enemyShots = [];
    this.applyRegionArena();
    this.notice(`REGION ${this.regionIdx + 1}: ${this.region.name}`, this.region.color, 'region');
  }
  /** Called by App after the region-clear chest choice. */
  public afterChest() {
    if (this.regionPhase === 'cleared') this.advanceRegion();
  }
  private updateDeep(dt: number) {
    // regions / endless progression
    this.updateCataclysm(dt);
    const frozen = this.cata.phase !== 'idle' && this.cata.phase !== 'crack';
    if (frozen) { /* region + endless timers freeze during a cataclysm scene */ } else if (!this.inEndless) {
      if (this.regionPhase === 'fight') {
        this.regionTime += dt;
        if (this.regionTime >= this.region.duration) { this.regionPhase = 'boss'; this.spawnBoss(this.region.boss.name, this.region.boss.hp); }
      }
    } else {
      this.endlessTime += dt;
      if (this.endlessTime >= this.nextEndlessBoss) {
        this.nextEndlessBoss += ENDLESS_BOSS_EVERY;
        if (!this.currentBoss) {
          const n = Math.round(this.endlessTime / ENDLESS_BOSS_EVERY);
          this.spawnBoss(`Endless Colossus #${n}`, Math.round(15000 * (1 + n)));
          this.applyRegionArena();
        }
      }
    }
    // hazards (telegraphed circle at player's position, detonates after 1.3s)
    const hz = this.inScene ? SCENES[this.cata.kind!].hazard : this.region.hazard; const hzMul = this.inEndless ? 0.35 + 0.15 * (this.endlessTime / 60) : 1;
    this.hazardTimer -= dt;
    if (this.hazardTimer <= 0) {
      this.hazardTimer = hz.every * (this.inEndless ? Math.max(0.5, 1.2 - this.endlessTime / 900) : 1);
      const n = this.inEndless ? 1 + Math.min(3, Math.floor(this.endlessTime / 180)) : 1 + Math.floor(this.regionIdx / 2);
      for (let k = 0; k < n; k++) this.hazards.push({ x: this.playerX + (k ? (Math.random() - 0.5) * 360 : 0), y: this.playerY + (k ? (Math.random() - 0.5) * 300 : 0), r: hz.radius, t: 1.3, dmg: Math.round(hz.dmg * hzMul), color: hz.color, slow: hz.slow, air: hz.air });
    }
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.t -= dt;
      if (h.t <= 0) {
        FX.ring(h.x, h.y, h.r, `rgba(${h.color},1)`, 0.5);
        if (Math.hypot(this.playerX - h.x, this.playerY - h.y) < h.r && !this.stats.isDashing && (!this.airborne || h.air)) {
          this.hurt(h.dmg);
          if (h.slow) this.slowUntil = this.gameTimeSeconds + 2.5;
          this.spawnFloatingText(`-${h.dmg} ${hz.name}`, this.playerX, this.playerY - 40, `rgb(${h.color})`);
        }
        this.hazards.splice(i, 1);
      }
    }
    // burning zones
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; z.t += dt; z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = 0.5;
        for (const e of this.enemies) if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.radius) this.damageEnemy(e, Math.round(z.dps * 0.5), z.steam ? '#e2e8f0' : '#fb923c', z.steam ? undefined : 'fire', false);
      }
      if (z.t >= z.max) this.zones.splice(i, 1);
    }
    // despawn far non-boss enemies (player roaming far away)
    for (let i = this.enemies.length - 1; i >= 0; i--) { const e = this.enemies[i]; if (!e.isBoss && !e.elite && Math.hypot(e.x - this.playerX, e.y - this.playerY) > Math.max(1700, this.offDist() * 1.9)) { this.enemies.splice(i, 1); this.despawned++; } }
    if (this.amberT === undefined) this.amberT = 0;
    // perf caps
    { const pc = this.lod >= 2 ? 160 : this.lod === 1 ? 280 : this.MAX_PARTICLES; if (this.particles.length > pc) this.particles.splice(0, this.particles.length - pc); }
    if (this.damageNumbers.length > 60) this.damageNumbers.splice(0, this.damageNumbers.length - 60);
    if (this.projectiles.length > 220) this.projectiles.splice(0, this.projectiles.length - 220);
  }
  public deepState() {
    const fmt = (t: number) => `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
    return {
      mode: this.mode, endless: this.inEndless, regionIdx: this.regionIdx, regionTotal: REGIONS.length,
      regionName: this.region.name, regionColor: this.region.color,
      timeLeft: fmt(Math.max(0, this.region.duration - this.regionTime)), phase: this.regionPhase, endlessTime: fmt(this.endlessTime),
      synergies: this.synergies.map((id) => { const y = SYNERGIES.find((q) => q.id === id)!; return { id, name: y.name, color: y.color, desc: y.desc }; }),
      artifacts: Object.entries(this.artifacts).map(([id, level]) => { const a = artifactById(id)!; return { id, name: a.name, icon: a.icon, color: a.color, level, desc: a.desc(level) }; }),
    };
  }
  public fps() {
    const f = this.frameTimes; if (!f.length) return null;
    const s = [...f].sort((x, y) => x - y);
    return { avg: f.reduce((a, b) => a + b, 0) / f.length, p95: s[Math.floor(s.length * 0.95)], n: f.length };
  }
  /** Difficulty multipliers for regular spawns. */
  private diff() {
    if (this.inEndless) return endlessScale(this.endlessTime);
    const r = this.region; const ramp = 1 + 0.5 * Math.min(1, this.regionTime / r.duration);
    return { hp: r.hp * ramp, dmg: r.dmg * (0.85 + 0.3 * Math.min(1, this.regionTime / r.duration)), speed: 1, spawn: r.spawn / ramp, cap: 110 };
  }
  public summaryExtra() {
    const best = loadBest();
    const et = this.endlessTime; const fmt = (t: number) => `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
    const cleared = this.mode === 'endless' ? 0 : this.inEndless ? REGIONS.length : this.regionIdx;
    const score = Math.round(this.enemiesDefeated * 10 + cleared * 5000 + et * 20 + this.bossKills * 2500);
    let newBest = false;
    if (this.mode === 'endless' || this.inEndless) {
      if (score > best.endless.score) { best.endless = { time: Math.round(et), kills: this.enemiesDefeated, score }; newBest = true; }
    }
    if (this.mode === 'regions' && (cleared > best.regions.cleared || (this.regionIdx + 1 > best.regions.best))) { best.regions = { best: Math.max(best.regions.best, this.regionIdx + 1), time: Math.round(this.gameTimeSeconds), cleared: Math.max(cleared, best.regions.cleared) }; newBest = newBest || this.mode === 'regions'; }
    saveBest(best);
    return { mode: this.mode, regionReached: this.regionIdx + 1, regionName: this.inEndless ? 'Endless' : this.region.name, endlessTime: this.inEndless ? fmt(et) : undefined, score, newBest,
      bestText: `Best endless: ${fmt(best.endless.time)} · ${best.endless.kills} kills · ${best.endless.score} pts | Best region: ${best.regions.best}/${REGIONS.length}` };
  }

  private emitSpells() {
    this.callbacks.onSpellsUpdate?.(this.spells.map((s) => ({ ...s })));
  }

  public castGap() {
    return 0.35 * Math.pow(0.75, this.fastCasting);
  }

  public learnSpell(id: string, level = 1) {
    if (!BASE_SPELLS[id] || this.spells.some((s) => s.id === id)) return;
    this.spells.push(makeSpell(id, level));
    this.checkCombos();
    this.checkSynergies();
    this.emitSpells();
  }

  public levelSpell(id: string) {
    const sp = this.spells.find((s) => s.id === id);
    if (!sp || sp.isCombo || sp.level >= sp.maxLevel) return;
    sp.level++;
    applySpellLevel(sp);
    this.spawnFloatingText(`${sp.name} Lv ${sp.level}`, this.playerX, this.playerY - 50, sp.color, true);
    this.checkCombos();
    this.checkSynergies();
    this.emitSpells();
  }

  private checkCombos() {
    const base = this.spells.filter((s) => !s.isCombo);
    for (let i = 0; i < base.length; i++) {
      for (let j = i + 1; j < base.length; j++) {
        const combo = canFormCombo(base[i], base[j]);
        if (combo && !this.spells.some((s) => s.id === combo.id)) {
          this.spells.push(makeComboSpell(combo.id));
          this.comboLog.push(`unlocked:${combo.id}`);
          FX.star(this.playerX, this.playerY, 260);
          this.spawnFloatingText(`COMBO: ${combo.name}!`, this.playerX, this.playerY - 70, combo.color, true);
          this.callbacks.onComboUnlocked?.(combo.name);
        }
      }
    }
  }

  public getUpgradeChoices(n = 4): UpgradeChoice[] {
    const pool: UpgradeChoice[] = [];
    const owned = this.spells.filter((s) => !s.isCombo);
    if (owned.length < MAX_MAGIC_SLOTS) {
      for (const id of BASE_SPELL_IDS) {
        if (owned.some((s) => s.id === id)) continue;
        const b = BASE_SPELLS[id];
        pool.push({ id: `new:${id}`, kind: 'new', title: `${b.name} Lv 1`, desc: spellEffectText(makeSpell(id, 1)) + (id === 'spirit' ? ' · ' + spiritUnlockText(this.spiritTotal(1)) : ''), icon: b.icon, color: b.color, level: 1 });
      }
    }
    for (const sp of owned) {
      if (sp.level >= sp.maxLevel) continue;
      const nxt = applySpellLevel({ ...sp, level: sp.level + 1 });
      pool.push({ id: `lvl:${sp.id}`, kind: 'level', title: `${sp.name} Lv ${sp.level + 1}`, desc: `${spellEffectText(nxt)} (was ${sp.count}), +25% damage${sp.id === 'spirit' ? ' · ' + spiritUnlockText(this.spiritTotal(nxt.count)) : ''}`, icon: sp.icon, color: sp.color, level: sp.level + 1 });
    }
    if (owned.length > 0 && this.fastCasting < 6) {
      pool.push({ id: 'fast_cast', kind: 'fast', title: `Fast Casting ${this.fastCasting + 1}`, desc: '-25% cast gap, -10% cooldowns (stacks)', icon: 'Timer', color: '#facc15', level: this.fastCasting + 1 });
    }
    for (const [id, p] of Object.entries(PASSIVES)) {
      pool.push({ id, kind: 'passive', title: p.title, desc: p.desc, icon: p.icon, color: '#a3e635' });
    }
    // Prefer magic options: shuffle magic & others separately, take up to n-1 magic first
    const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const magic = shuffle(pool.filter((c) => c.kind !== 'passive'));
    const pas = shuffle(pool.filter((c) => c.kind === 'passive'));
    const evo = this.evolveChoices();
    // v7: while a slot is free, always offer at least one brand-new magic (new spells first)
    const news = magic.filter((c) => c.kind === 'new');
    if (news.length) { const fresh = news.filter((c) => !!SPELL2_BY_ID[c.id.slice(4)]); const pick = (fresh.length && Math.random() < 0.7 ? fresh : news)[0]; magic.splice(magic.indexOf(pick), 1); magic.unshift(pick); }
    const out = [...evo.slice(0, 1), ...magic.slice(0, n - 1 - Math.min(1, evo.length))];
    while (out.length < n && pas.length) out.push(pas.shift()!);
    while (out.length < n && magic.length > out.length) out.push(magic[out.length]);
    return out;
  }

  public applyUpgrade(id: string) {
    if (id.startsWith('evo:')) this.evolveSpell(id.slice(4));
    else if (id.startsWith('art:')) this.grantArtifact(id.slice(4));
    else if (id.startsWith('new:')) this.learnSpell(id.slice(4));
    else if (id.startsWith('lvl:')) this.levelSpell(id.slice(4));
    else if (id === 'fast_cast') {
      this.fastCasting++;
      this.spawnFloatingText(`Fast Casting ${this.fastCasting}`, this.playerX, this.playerY - 50, '#facc15', true);
      this.emitSpells();
    } else if (id === 'pass_power') this.stats.spellPower += 15;
    else if (id === 'pass_crit') this.stats.critChance += 5;
    else if (id === 'pass_vitality') { this.stats.maxHp += 100; this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 100); }
    else if (id === 'pass_magnet') this.stats.pickupRadius += 50;
    else if (id === 'pass_swift') this.stats.speed *= 1.1;
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  public cdMul(id: string) { return Math.pow(0.9, this.fastCasting) * (1 - this.stats.cooldownReduction / 100) * (1 - 0.07 * this.art('hourglass')) * (this.art('ether_arrow') && (id === 'arcane_missiles' || id === 'spirit') ? 0.8 : 1); }
  private autoCast(spell: Spell) {
    if (spell.isCombo) {
      this.castCombo(spell); this.addCata(CATA_GAIN.combo, 'combo');
    } else this.autoCastRaw(this.eff(spell));
    if (this.ibg.enabled) { const el = spell.id === 'spirit' ? 'spirit' : ELEMENT_OF[spell.id]; this.ibg.magic(IBG_EL_COLOR[el as string] ?? '#a78bfa', this.playerX, this.playerY); }
    this.castLog.push({ id: spell.id, t: this.gameTimeSeconds });
    if (!spell.isCombo) this.noteCastForFusion(spell.id);
    if (this.castLog.length > 60) this.castLog.shift();
    spell.currentCooldown = spell.cooldown * this.cdMul(spell.id);
    this.castGapTimer = this.castGap();
  }

  private castCombo(spell: Spell) {
    const recipe = COMBO_MAGIC_RECIPES.find((r) => r.id === spell.id);
    if (!recipe) return;
    const a = this.spells.find((s) => s.id === recipe.component1);
    const b = this.spells.find((s) => s.id === recipe.component2);
    this.comboLog.push(`cast:${spell.id}`);
    FX.star(this.playerX, this.playerY, 300);
    this.spawnFloatingText(recipe.name, this.playerX, this.playerY - 60, recipe.color, true);
    for (const c of [a, b]) {
      if (!c) continue;
      const ce = this.eff(c);
      const boosted = { ...ce, damage: Math.round(ce.damage * 1.5), count: ce.count + 2, area: Math.round(ce.area * 1.3) };
      this.autoCastRaw(boosted);
    }
  }

  private autoCastRaw(spell: Spell) {
    if (spell.id === 'frost_nova') this.castFrostNova(spell);
    else if (spell.id === 'thunderstorm') this.castThunderstorm(spell);
    else if (spell.id === 'cataclysm') this.castCataclysm(spell);
    else if (spell.id === 'arcane_missiles') this.castArcaneMissiles(spell);
    else if (spell.id === 'spirit') this.castSpirits(spell);
    else if (SPELL2_BY_ID[spell.id]) { this.magic2.h.enemies = this.enemies; this.magic2.cast(spell); }
  }

  public triggerSpellManual(spellId: string) {
    const spell = this.spells.find((s) => s.id === spellId);
    if (!spell || spell.currentCooldown > 0) return;

    if (spellId === 'frost_nova') {
      this.castFrostNova(spell);
    } else if (spellId === 'thunderstorm') {
      this.castThunderstorm(spell);
    } else if (spellId === 'cataclysm') {
      this.castCataclysm(spell);
    } else if (spellId === 'arcane_missiles') {
      this.castArcaneMissiles(spell);
    } else if (spellId === 'spirit') this.castSpirits(this.eff(spell));
    else if (SPELL2_BY_ID[spellId]) this.autoCastRaw(this.eff(spell));
    spell.currentCooldown = spell.cooldown * (1 - this.stats.cooldownReduction / 100);
  }

  public useBeltItem(itemId: string) {
    if (itemId === 'soul_shard') {
      this.addXp(500);
      this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 300);
      sound.playItemUse();
      this.spawnFloatingText('Soul Surge! +500 XP', this.playerX, this.playerY - 40, '#a855f7');
    } else if (itemId === 'mana_elixir') {
      this.stats.mana = this.stats.maxMana;
      this.spells.forEach((s) => (s.currentCooldown = 0));
      sound.playItemUse();
      this.spawnFloatingText('Infinite Mana & Instant Reset!', this.playerX, this.playerY - 40, '#38bdf8');
    } else if (itemId === 'vitality_emerald') {
      const healAmt = Math.round(this.stats.maxHp * 0.5);
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + healAmt);
      sound.playItemUse();
      this.spawnFloatingText(`+${healAmt} HP`, this.playerX, this.playerY - 40, '#22c55e');
    } else if (itemId === 'fire_rune') {
      sound.playMeteorExplosion();
      this.screenShake = 22;
      this.spawnFloatingText('HELLFIRE PURGE!', this.playerX, this.playerY - 50, '#f97316', true);
      this.enemies.forEach((e) => {
        if (!e.isBoss) {
          e.hp -= 1500;
          this.totalDamageDealt += 1500;
          this.addDamageNumber(e.x, e.y, 1500, true);
        } else {
          e.hp -= 3000;
          this.addDamageNumber(e.x, e.y, 3000, true);
        }
      });
    } else if (itemId === 'ancient_grimoire') {
      sound.playItemUse();
      this.stats.spellPower += 150;
      this.spawnFloatingText('Spell Power +150%!', this.playerX, this.playerY - 40, '#eab308');
      setTimeout(() => {
        this.stats.spellPower -= 150;
      }, 10000);
    }
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private seedInitialBattlefield() {
    if (this.currentWave >= 8) {
      // Void Colossus Titan in upper right (exact position as in mockup)
      const boss: Enemy = {
        id: 'boss_colossus_1',
        name: 'Void Colossus Titan',
        type: 'colossus_boss',
        x: 250,
        y: -150,
        vx: 0,
        vy: 0,
        radius: 65,
        hp: 40000,
        maxHp: 40000,
        speed: 1.2,
        damage: 190,
        xpValue: 900,
        crystalDropChance: 1.0,
        goldValue: 1400,
        color: '#ef4444',
        glowColor: '#f97316',
        isBoss: true,
        attackCooldown: 3.5,
      };
      this.enemies.push(boss);
      this.currentBoss = boss;
      this.callbacks.onBossState(boss);

      // Initial demon hordes surrounding the stone sanctuary
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 520 + 200;
        const typeRoll = Math.random();
        const type = typeRoll < 0.45 ? 'crawler' : typeRoll < 0.8 ? 'shadow_fiend' : 'hellhound';
        this.spawnEnemyAt(type, Math.cos(angle) * dist, Math.sin(angle) * dist);
      }
    } else {
      // Wave 1: Initial scout crawlers
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 450 + 220;
        this.spawnEnemyAt('crawler', Math.cos(angle) * dist, Math.sin(angle) * dist);
      }
    }

    // Initial drops
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 420 + 120;
      this.lootItems.push({
        id: `loot_${Math.random()}`,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        type: i % 3 === 0 ? 'crystal' : i % 3 === 1 ? 'gold' : 'xp',
        value: i % 3 === 0 ? 1 : i % 3 === 1 ? 60 : 35,
        color: i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#eab308' : '#818cf8',
        bobOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  public static CAP_SLACK = 10;
  private spawnEnemyAt(type: Enemy['type'], x: number, y: number, opts: { elite?: boolean; small?: boolean; hpMul?: number; force?: boolean } = {}): Enemy | null {
    void 0;
    const def = ENEMY_DEFS[type] ?? ENEMY_DEFS.crawler;
    const df = this.diff();
    if (!opts.force && this.enemies.length >= df.cap + GameEngine.CAP_SLACK) return null; // hard crowd cap
    const elite = opts.elite ?? (!opts.small && Math.random() < ELITE_RANDOM_CHANCE);
    let radius = def.r * (opts.small ? 0.6 : 1);
    let hp = Math.round(def.hp * df.hp * (opts.hpMul ?? 1));
    let damage = Math.round(def.dmg * df.dmg * 0.7);
    if (elite) { hp *= ELITE_HP; damage = Math.round(damage * ELITE_DMG); radius *= 1.25; }
    const e: Enemy = {
      id: `enemy_${Math.random()}`, name: (elite ? 'Elite ' : '') + def.name, type, x, y, vx: 0, vy: 0, radius, hp, maxHp: hp,
      speed: def.speed * df.speed * (opts.small ? 1.25 : 1), damage, xpValue: Math.round(def.xp * (elite ? 6 : 1)), crystalDropChance: elite ? 1 : 0.18,
      goldValue: def.gold * (elite ? 5 : 1), color: def.color, glowColor: def.glow, isBoss: false,
      flying: !!def.flying, elite, small: !!opts.small, ai: def.shot ? def.shot.every * (0.4 + Math.random() * 0.8) : 1 + Math.random() * 2, ai2: 0, state: 0,
    };
    this.enemies.push(e);
    if (this.spawnLog.length < 400) this.spawnLog.push(type + (elite ? '*' : ''));
    if (elite) this.notice(`ELITE: ${def.name} approaches!`, ELITE_AURA[this.regionIdx % ELITE_AURA.length], 'elite');
    return e;
  }
  /** Debug/QA: spawn an enemy relative to the player. */
  public spawnEnemy(type: string, dx = 200, dy = 0, elite = false) {
    return this.spawnEnemyAt(type as Enemy['type'], this.playerX + dx, this.playerY + dy, { elite })?.id;
  }
  public enemySnapshot() { return this.enemies.map((e) => ({ id: e.id, type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, flying: !!e.flying, elite: !!e.elite, small: !!e.small, state: e.state ?? 0, boss: !!e.isBoss })); }
  public debugState() { return { px: this.playerX, py: this.playerY, hp: this.stats.hp, maxHp: this.stats.maxHp, shots: this.enemyShots.length, enemies: this.enemies.length, zones: this.zones.map((z) => ({ steam: !!z.steam, r: z.r })), spirits: this.spirits.length, labels: this.labels.map((l) => l.text), beams: this.beams.length, arenaR: this.arenaRadius }; }
  public setPlayerPos(x: number, y: number) { this.playerX = x; this.playerY = y; this.cameraX = x; this.cameraY = y; }
  public clearEnemies() { this.enemies = this.enemies.filter((e) => e.isBoss); this.enemyShots = []; }
  public setHp(v: number) { this.stats.hp = v; }

  private spawnPack() {
    const pool = this.inEndless ? NEW_ENEMY_TYPES.filter((t) => ENEMY_DEFS[t].flying || ENEMY_DEFS[t].shot) : REGION_PACKS[Math.min(this.regionIdx, REGION_PACKS.length - 1)];
    const m = this.endlessTime / 60;
    const n = this.inEndless ? 6 + Math.min(10, Math.floor(m * 1.5)) : 6 + 2 * this.regionIdx;
    const a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const t = pool[i % pool.length];
      const a = a0 + (Math.random() - 0.5) * 0.9; const d = this.offDist() + Math.random() * 120;
      const q = this.clampSpawn(this.playerX + Math.cos(a) * d, this.playerY + Math.sin(a) * d);
      this.spawnEnemyAt(t as Enemy['type'], q.x, q.y, { elite: false });
    }
    this.notice(`A ${ENEMY_DEFS[pool[0]].name} pack swoops in!`, '#7dd3fc', 'pack');
  }

  /** Behaviour-driven movement for non-boss enemies. */
  private moveEnemy(e: Enemy, dx: number, dy: number, dist: number, dt: number, slowK: number) {
    const def = ENEMY_DEFS[e.type] ?? ENEMY_DEFS.crawler;
    const sp = e.speed * 60 * dt * slowK * ((e.beaconUntil ?? 0) > this.gameTimeSeconds ? 1 - SPIRIT.BEACON_SLOW : 1);
    const ux = dx / dist, uy = dy / dist;
    let mx = ux, my = uy;
    e.ai = (e.ai ?? 0) - dt;
    switch (def.behavior) {
      case 'swarm': { const w = Math.sin(this.gameTimeSeconds * 4 + (e.x + e.y) * 0.01) * 0.8; mx = ux - uy * w; my = uy + ux * w; break; }
      case 'ranged': case 'lobber': case 'summoner': {
        const want = def.behavior === 'summoner' ? 300 : def.behavior === 'lobber' ? 230 : 270;
        const k = dist > want + 40 ? 1 : dist < want - 50 ? -0.8 : 0;
        mx = ux * k - uy * 0.35; my = uy * k + ux * 0.35;
        if (def.shot && e.ai <= 0 && dist < 620) {
          e.ai = def.shot.every * (e.elite ? 0.7 : 1);
          const lead = 0.25; const tx = this.playerX + (this.joystickVector.x * this.stats.speed * 60 * lead), ty = this.playerY + (this.joystickVector.y * this.stats.speed * 60 * lead);
          const a = Math.atan2(ty - e.y, tx - e.x);
          const dmg = Math.round(def.shot.dmg * this.diff().dmg * 0.7 * (e.elite ? 1.5 : 1));
          const fire = (off: number) => this.enemyShots.push({ x: e.x, y: e.y, vx: Math.cos(a + off) * def.shot!.speed, vy: Math.sin(a + off) * def.shot!.speed, dmg, color: def.shot!.color, ground: !!def.shot!.ground, slow: def.shot!.slow, life: 0, r: def.shot!.ground ? 9 : 6, src: e.type });
          fire(0); if (e.elite) { fire(-0.25); fire(0.25); }
          if (this.enemyShots.length > 120) this.enemyShots.shift();
        }
        if (def.behavior === 'summoner' && e.ai <= 0) {
          e.ai = 6;
          if (this.enemies.length < this.diff().cap + 30) for (let k2 = 0; k2 < 3; k2++) { const a = Math.random() * 6.28; this.spawnEnemyAt('crawler', e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, { elite: false, hpMul: 0.6 }); }
          FX.ring(e.x, e.y, 60, 'rgba(163,230,53,1)', 0.4);
        }
        break;
      }
      case 'exploder': {
        if (e.state === 1) {
          mx = 0; my = 0; e.ai2 = (e.ai2 ?? 0) - dt;
          if ((e.ai2 ?? 0) <= 0) {
            FX.fire(e.x, e.y, 110); this.shake(10);
            if (dist < 110 && !this.airborne && !this.stats.isDashing) { const d = Math.round(160 * this.diff().dmg * 0.7 * (e.elite ? 1.5 : 1)); this.hurt(d); this.label(`-${d} BLAST`, this.playerX, this.playerY - 50, '#fb923c'); }
            e.state = 2; e.hp = 0;
          }
        } else if (dist < 64 + e.radius) { e.state = 1; e.ai2 = 0.6; }
        break;
      }
      case 'charger': {
        e.ai2 = (e.ai2 ?? 0) - dt;
        if (e.state === 1) { mx = 0; my = 0; if (e.ai2 <= 0) { e.state = 2; e.ai2 = 0.6; } }
        else if (e.state === 2) { e.x += (e.dx ?? 0) * sp * 6; e.y += (e.dy ?? 0) * sp * 6; if (e.ai2 <= 0) { e.state = 0; e.ai2 = 2.5; } return; }
        else if (dist < 340 && e.ai2 <= 0) { e.state = 1; e.ai2 = 0.8; e.dx = ux; e.dy = uy; }
        break;
      }
      case 'teleport': {
        if (e.ai <= 0) { e.ai = 3; FX.flash(e.x, e.y, 40, '#d8b4fe'); const a = Math.random() * 6.28; e.x = this.playerX + Math.cos(a) * 110; e.y = this.playerY + Math.sin(a) * 110; FX.flash(e.x, e.y, 40, '#d8b4fe'); }
        break;
      }
    }
    // cheap separation (first 12 only)
    let rx = 0, ry = 0;
    for (let j = 0; j < Math.min(this.enemies.length, 12); j++) { const o = this.enemies[j]; if (o === e) continue; const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy); if (od > 0 && od < 32) { rx += ox / od; ry += oy / od; } }
    e.x += (mx * 0.7 + rx * 0.3) * sp; e.y += (my * 0.7 + ry * 0.3) * sp;
  }

  private updateEnemyShots(dt: number) {
    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      const b = this.enemyShots[i]; b.life += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      let dead = b.life > 3.2 || Math.hypot(b.x - this.playerX, b.y - this.playerY) > 1400;
      if (!dead && Math.hypot(b.x - this.playerX, b.y - this.playerY) < b.r + 16 && !this.stats.isDashing && !(b.ground && this.airborne)) {
        this.hurt(b.dmg); if (b.slow) this.slowUntil = this.gameTimeSeconds + 1.5;
        FX.flash(this.playerX, this.playerY - this.casterZ(), 30, b.color); sound.playHit(); this.shake(4); dead = true;
      }
      if (dead) this.enemyShots.splice(i, 1);
    }
  }

  // ---------- fusion bursts ----------
  private noteCastForFusion(id: string) {
    const el = id === 'spirit' ? 'spirit' : ELEMENT_OF[id];
    if (!el) return;
    const t = this.gameTimeSeconds;
    // pair with the most recent cast of any OTHER element whose pair is off cooldown
    let best: string | null = null; let bt = -1;
    for (const [o, r] of Object.entries(this.lastByEl)) {
      if (o === el || t - r.t > FUSION_WINDOW) continue;
      const key = [o, el].sort().join('+');
      if (!FUSIONS[key] || (this.pairCd[key] ?? 0) > 0) continue;
      if (r.t > bt) { bt = r.t; best = key; }
    }
    this.lastCast = { el, id, t };
    if (best) { const f = FUSIONS[best]; const other = best.split('+').find((x) => x !== el)!; delete this.lastByEl[other]; this.triggerFusion(best, f.name, f.color); return; }
    this.lastByEl[el] = { id, t };
  }
  public pairState() {
    return Object.keys(FUSIONS).map((k) => ({ key: k, name: FUSIONS[k].name, cd: Math.max(0, this.pairCd[k] ?? 0), max: FUSION_CD - this.art('fusion_core'), count: this.pairLog.filter((p) => p.key === k).length }));
  }
  public triggerFusion(key: string, name: string, color: string) {
    const cdMax = FUSION_CD - this.art('fusion_core');
    this.pairCd[key] = cdMax; this.fusionCd = cdMax;
    this.fusionLog.push(name);
    const def = FUSIONS[key];
    { const c = this.cata; const t = this.gameTimeSeconds; c.recent = c.recent.filter((r) => t - r.t <= 6); c.recent.push({ k: key, t }); const before = c.meter; this.addCata(CATA_GAIN.fusion, 'fusion:' + key); let gain = c.meter - before; if (new Set(c.recent.map((r) => r.k)).size >= 3 && c.phase === 'idle') { const b2 = c.meter; this.addCata(CATA_GAIN.tripleFusion, 'triple-fusion'); gain += c.meter - b2; } this.cataFeedPush(`${name} +${Math.round(gain)}`, color); }
    sound.play('pair_' + key, 1.2);
    const tgt = this.findDensestCluster(220) ?? { x: this.playerX + Math.cos(this.playerAngle) * 160, y: this.playerY + Math.sin(this.playerAngle) * 160 };
    const base = this.spells.filter((s) => !s.isCombo); const avg = base.reduce((a, s) => a + s.damage, 0) / Math.max(1, base.length);
    const dmg = Math.round(avg * def.dmgMul * (this.stats.spellPower / 100) * (1 + 0.25 * this.art('fusion_core')));
    this.label(name.toUpperCase() + '!', tgt.x, tgt.y - 120, color, true);
    this.shake(10); this.hitStop = Math.max(this.hitStop, 0.04);
    const hits = this.pairEffect(key, tgt, dmg, color, def.radius);
    this.pairLog.push({ key, t: this.gameTimeSeconds, hits, fx: key }); if (this.pairLog.length > 200) this.pairLog.shift();
  }
  /** Each pair has its own distinct effect. Returns number of enemies hit. */
  private pairEffect(key: string, tgt: { x: number; y: number }, dmg: number, color: string, r: number): number {
    let hits = 0; const now = performance.now();
    const inR = (x: number, y: number, rr: number) => this.enemies.filter((e) => Math.hypot(e.x - x, e.y - y) <= rr + e.radius);
    const hit = (e: Enemy, d: number, el: Element, c = color) => { this.damageEnemy(e, Math.round(d), c, el); hits++; };
    const nearest = (x: number, y: number, n: number, maxD: number) => this.enemies.map((e) => ({ e, d: Math.hypot(e.x - x, e.y - y) })).filter((q) => q.d <= maxD).sort((p, q) => p.d - q.d).slice(0, n).map((q) => q.e);
    switch (key) {
      case 'fire+ice': { // thermal shock + steam cloud
        FX.ring(tgt.x, tgt.y, r, 'rgba(226,232,240,1)', 0.5); FX.flash(tgt.x, tgt.y, r * 0.8, '#ffffff');
        for (const e of inR(tgt.x, tgt.y, r)) hit(e, dmg * ((e.frozenUntil ?? 0) > now ? 1.6 : 1), 'fire');
        this.addSteam(tgt.x, tgt.y, 150, 4.5, dmg * 0.3); break;
      }
      case 'fire+lightning': { // plasma nova + 6 burning patches
        FX.star(tgt.x, tgt.y, r); FX.ring(tgt.x, tgt.y, r, 'rgba(251,146,60,1)', 0.6); this.skyStrike(tgt.x, tgt.y, color);
        for (const e of inR(tgt.x, tgt.y, r)) hit(e, dmg, 'fire');
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; this.addZone(tgt.x + Math.cos(a) * r * 0.75, tgt.y + Math.sin(a) * r * 0.75, 60, 3, dmg * 0.25, '251,146,60'); }
        break;
      }
      case 'ice+lightning': { // freeze then chain sparks
        FX.ring(tgt.x, tgt.y, r, 'rgba(125,211,252,1)', 0.5);
        const fr = inR(tgt.x, tgt.y, r); for (const e of fr) { e.frozenUntil = now + 2000; hit(e, dmg * 0.5, 'ice'); }
        let prev = tgt; const pool = [...fr];
        for (let k = 0; k < 6 && pool.length; k++) { let bi = 0, bd = 1e9; pool.forEach((e, i) => { const d = Math.hypot(e.x - prev.x, e.y - prev.y); if (d < bd) { bd = d; bi = i; } }); const e = pool.splice(bi, 1)[0]; this.beams.push({ x1: prev.x, y1: prev.y, x2: e.x, y2: e.y, color: '#bae6fd', life: 0.22 }); FX.bolt(e.x, e.y); hit(e, dmg * 0.7, 'lightning', '#bae6fd'); prev = e; }
        break;
      }
      case 'arcane+fire': { // hex the 6 densest -> fire pillars
        const marks = nearest(tgt.x, tgt.y, 6, 400);
        if (!marks.length) this.addZone(tgt.x, tgt.y, r, 2.5, dmg * 0.4, '244,114,182');
        for (const m of marks) { FX.fire(m.x, m.y, r); FX.ring(m.x, m.y, r, 'rgba(244,114,182,1)', 0.45); for (const e of inR(m.x, m.y, r)) hit(e, dmg * 0.8, 'fire'); this.addZone(m.x, m.y, r * 0.8, 2.5, dmg * 0.2, '244,114,182'); }
        break;
      }
      case 'arcane+ice': { // 8 prism lances piercing along lines
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2; const x2 = tgt.x + Math.cos(a) * r, y2 = tgt.y + Math.sin(a) * r;
          this.beams.push({ x1: tgt.x, y1: tgt.y, x2, y2, color: '#c7d2fe', life: 0.22 });
          for (const e of this.enemies) { const dx = e.x - tgt.x, dy = e.y - tgt.y; const along = dx * Math.cos(a) + dy * Math.sin(a); if (along < 0 || along > r) continue; const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (perp <= 18 + e.radius) { hit(e, dmg * 0.6, 'ice', '#c7d2fe'); e.frozenUntil = Math.max(e.frozenUntil ?? 0, now + 700); } }
        }
        FX.flash(tgt.x, tgt.y, 90, '#a5b4fc'); break;
      }
      case 'arcane+lightning': { // 9 arc bolts around the player
        const pool = this.enemies.filter((e) => Math.hypot(e.x - this.playerX, e.y - this.playerY) < 520);
        for (let k = 0; k < 9 && pool.length; k++) { const e = pool[Math.floor(Math.random() * pool.length)]; FX.bolt(e.x, e.y); FX.ring(e.x, e.y, 40, 'rgba(147,197,253,1)', 0.3); for (const q of inR(e.x, e.y, 40)) hit(q, dmg * 0.7, 'lightning', '#93c5fd'); }
        break;
      }
      case 'fire+spirit': { // spirits dive -> soulfire pillars
        const pts = this.spirits.length ? this.spirits.map((sp) => { const t = this.findNearestEnemy(sp.x, sp.y, 320); sp.dash = 0.3; sp.target = t; return t ? { x: t.x, y: t.y } : { x: sp.x, y: sp.y }; }) : [tgt];
        for (const p of pts.slice(0, 12)) { FX.fire(p.x, p.y, r); for (const e of inR(p.x, p.y, r)) hit(e, dmg * 0.7, 'fire', '#5eead4'); this.addZone(p.x, p.y, r, 2, dmg * 0.2, '94,234,212'); }
        break;
      }
      case 'ice+spirit': { // wraith ring around the player
        const px = this.playerX, py = this.playerY;
        FX.ring(px, py, r, 'rgba(153,246,228,1)', 0.6); FX.ring(px, py, r * 0.6, 'rgba(153,246,228,1)', 0.45);
        for (const e of inR(px, py, r)) { hit(e, dmg, 'ice', '#99f6e4'); e.frozenUntil = now + 1500; }
        break;
      }
      case 'lightning+spirit': { // each spirit (and you) arcs into the 2 nearest
        const srcs = [{ x: this.playerX, y: this.playerY }, ...this.spirits.slice(0, 12).map((s) => ({ x: s.x, y: s.y }))];
        for (const s0 of srcs) for (const e of nearest(s0.x, s0.y, 2, r)) { this.beams.push({ x1: s0.x, y1: s0.y, x2: e.x, y2: e.y, color: '#67e8f9', life: 0.22 }); hit(e, dmg * 0.6, 'lightning', '#67e8f9'); }
        break;
      }
      case 'arcane+spirit': { // echo a magic for free + loot pull
        const base = this.spells.filter((s) => !s.isCombo && s.id !== 'spirit');
        if (base.length) { const sp = base[Math.floor(Math.random() * base.length)]; const e = this.eff(sp); const before = this.enemies.reduce((a, q) => a + q.hp, 0); this.autoCastRaw({ ...e, damage: Math.round(e.damage * 0.8) }); hits += this.enemies.reduce((a, q) => a + q.hp, 0) < before ? 1 : 0; this.label('ECHO: ' + sp.name, this.playerX, this.playerY - 90, color); }
        for (const it of this.lootItems) if (Math.hypot(it.x - this.playerX, it.y - this.playerY) < 600) it.magnetized = true;
        FX.ring(this.playerX, this.playerY, r, 'rgba(196,181,253,1)', 0.5); FX.star(this.playerX, this.playerY, 90);
        for (const e of inR(this.playerX, this.playerY, r)) hit(e, dmg * 0.5, 'arcane', color);
        break;
      }
      default: hits += this.genericPair(key, tgt, dmg, color, r, inR, hit); break;
    }
    return hits;
  }
  /** v7: data-driven effect for the 35 element pairs added with the new elements. */
  private genericPair(key: string, tgt: { x: number; y: number }, dmg: number, color: string, r: number, inR: (x: number, y: number, rr: number) => Enemy[], hit: (e: Enemy, d: number, el: Element, c?: string) => void): number {
    const def = FUSIONS[key]; if (!def?.prim) return 0;
    const [a, b] = key.split('+') as Element[]; const els = [a, b]; const n = def.n ?? 4; const now = performance.now(); const T = this.gameTimeSeconds;
    let hits = 0; const H = (e: Enemy, d: number, i = 0) => { hit(e, d, els[i % 2], color); hits++; status(e); };
    const rgb = EL_RGB[b as keyof typeof EL_RGB] ?? '200,200,255';
    const status = (e: Enemy) => {
      switch (def.st) {
        case 'freeze': if (!e.isBoss) e.frozenUntil = Math.max(e.frozenUntil ?? 0, now + 1500); break;
        case 'slow': e.slowUntil = T + 2.5; break;
        case 'poison': case 'burn': break;
        case 'knock': if (!e.isBoss) { const dx = e.x - tgt.x, dy = e.y - tgt.y, d = Math.hypot(dx, dy) || 1; e.x += (dx / d) * 90; e.y += (dy / d) * 90; } break;
        case 'pull': if (!e.isBoss) { const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1; const k = Math.min(d, 80); e.x += (dx / d) * k; e.y += (dy / d) * k; } break;
        default: break;
      }
    };
    const after = (x: number, y: number, rr: number) => {
      if (def.st === 'poison' || def.st === 'burn') this.addZone(x, y, rr * 0.8, 3, dmg * 0.2, def.st === 'poison' ? '163,230,53' : '249,115,22');
      if (def.st === 'steam') this.addSteam(x, y, rr, 3.5, dmg * 0.25);
    };
    if (def.st === 'heal') { this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 10 + n * 2); FX.flash(this.playerX, this.playerY, 60, '#bbf7d0'); }
    switch (def.prim) {
      case 'nova': FX.ring(tgt.x, tgt.y, r, `rgba(${rgb},1)`, 0.55); FX.flash(tgt.x, tgt.y, r * 0.7, color); for (const e of inR(tgt.x, tgt.y, r)) H(e, dmg); after(tgt.x, tgt.y, r * 0.6); break;
      case 'ring': FX.ring(this.playerX, this.playerY, r, `rgba(${rgb},1)`, 0.6); FX.ring(this.playerX, this.playerY, r * 0.6, color, 0.4); for (const e of inR(this.playerX, this.playerY, r)) H(e, dmg); break;
      case 'pillars': { const tg = this.enemies.filter((e) => this.onScreen(e.x, e.y, 0)).sort((p, q) => Math.hypot(p.x - tgt.x, p.y - tgt.y) - Math.hypot(q.x - tgt.x, q.y - tgt.y)).slice(0, n); if (!tg.length) tg.push({ x: tgt.x, y: tgt.y } as Enemy);
        tg.forEach((t, i) => { FX.fire(t.x, t.y, r); FX.flash(t.x, t.y, r, color); for (const e of inR(t.x, t.y, r)) H(e, dmg * 0.8, i); after(t.x, t.y, r); }); break; }
      case 'rain': for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, d = Math.random() * 240; const x = tgt.x + Math.cos(a) * d, y = tgt.y + Math.sin(a) * d; this.beams.push({ x1: x + 60, y1: y - 420, x2: x, y2: y, color, life: 0.22 }); FX.ring(x, y, r, `rgba(${rgb},1)`, 0.4); for (const e of inR(x, y, r)) H(e, dmg * 0.7, i); if (i % 2 === 0) after(x, y, r); } break;
      case 'lances': for (let i = 0; i < n; i++) { const ang = (i / n) * Math.PI * 2; const x2 = tgt.x + Math.cos(ang) * r, y2 = tgt.y + Math.sin(ang) * r; this.beams.push({ x1: tgt.x, y1: tgt.y, x2, y2, color, life: 0.22 });
        for (const e of this.enemies) { const dx = e.x - tgt.x, dy = e.y - tgt.y; const al = dx * Math.cos(ang) + dy * Math.sin(ang); if (al < 0 || al > r) continue; if (Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang)) <= 18 + e.radius) H(e, dmg * 0.6, i); } } FX.star(tgt.x, tgt.y, 80); break;
      case 'chain': { let prev = { x: this.playerX, y: this.playerY - 30 }; const pool = inR(tgt.x, tgt.y, 420); for (let k = 0; k < n && pool.length; k++) { let bi = 0, bd = 1e9; pool.forEach((e, i) => { const d = Math.hypot(e.x - prev.x, e.y - prev.y); if (d < bd) { bd = d; bi = i; } }); const e = pool.splice(bi, 1)[0]; this.beams.push({ x1: prev.x, y1: prev.y, x2: e.x, y2: e.y, color, life: 0.22 }); FX.flash(e.x, e.y, 40, color); H(e, dmg * 0.75, k); prev = e; } break; }
      case 'zone': for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const x = tgt.x + Math.cos(a) * r * 0.9, y = tgt.y + Math.sin(a) * r * 0.9; this.addZone(x, y, r * 0.7, 4, dmg * 0.3, rgb); FX.ring(x, y, r * 0.7, `rgba(${rgb},1)`, 0.4); } for (const e of inR(tgt.x, tgt.y, r * 1.6)) H(e, dmg * 0.5); after(tgt.x, tgt.y, r); break;
      case 'vortex': for (let i = 0; i < n; i++) { const a = (i / Math.max(1, n)) * Math.PI * 2; const x = tgt.x + Math.cos(a) * 70, y = tgt.y + Math.sin(a) * 70; FX.ring(x, y, r, `rgba(${rgb},1)`, 0.7); FX.ring(x, y, r * 0.5, color, 0.5);
        for (const e of inR(x, y, r * 1.5)) { if (!e.isBoss) { e.x += (x - e.x) * 0.5; e.y += (y - e.y) * 0.5; } H(e, dmg * 0.7, i); } after(x, y, r * 0.6); } break;
      case 'wave': { const ang = Math.atan2(tgt.y - this.playerY, tgt.x - this.playerX); for (let s = 0; s < 6; s++) { const d = 60 + s * r * 0.4; const x = this.playerX + Math.cos(ang) * d, y = this.playerY + Math.sin(ang) * d; FX.ring(x, y, r * 0.45, `rgba(${rgb},1)`, 0.35 + s * 0.05); }
        for (const e of this.enemies) { const dx = e.x - this.playerX, dy = e.y - this.playerY; const al = dx * Math.cos(ang) + dy * Math.sin(ang); if (al < 0 || al > r * 2.6) continue; if (Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang)) <= r * 0.6 + e.radius) H(e, dmg * 0.8); } after(tgt.x, tgt.y, r * 0.6); break; }
    }
    return hits;
  }
  public cataFeed: { txt: string; color: string; t: number }[] = [];
  private cataFeedPush(txt: string, color: string) { this.cataFeed.push({ txt, color, t: this.gameTimeSeconds }); if (this.cataFeed.length > 4) this.cataFeed.shift(); }
  private addSteam(x: number, y: number, r: number, dur: number, dps: number) {
    const st = this.zones.filter((z) => z.steam);
    if (st.length >= 6) this.zones.splice(this.zones.indexOf(st[0]), 1);
    if (this.zones.length >= 24) this.zones.shift();
    this.zones.push({ x, y, r, t: 0, max: dur, dps: dps * (1 + 0.5 * this.art('thermal_coil')), color: '226,232,240', tick: 0, steam: true });
    this.addCata(CATA_GAIN.steam, 'steam'); sound.play('steam', Math.min(1.5, 0.6 + r / 200));
  }

  // ---------- charge-up ----------
  public chargeStart(id: string) {
    const sp = this.spells.find((s) => s.id === id && !s.isCombo);
    if (!sp || this.isPaused) return false;
    this.charging = { id, t0: this.gameTimeSeconds }; return true;
  }
  private chargeMax() { return CHARGE_MAX * (1 - 0.3 * this.art('charge_battery')); }
  public chargeProgress() { return this.charging ? { id: this.charging.id, k: Math.min(1, (this.gameTimeSeconds - this.charging.t0) / this.chargeMax()) } : null; }
  public chargeCancel() { this.charging = null; }
  public chargeRelease() {
    const c = this.charging; this.charging = null;
    if (!c) return null;
    const sp = this.spells.find((s) => s.id === c.id); if (!sp) return null;
    const k = Math.min(1, (this.gameTimeSeconds - c.t0) / this.chargeMax());
    const e = this.eff(sp);
    const boosted = { ...e, damage: Math.round(e.damage * (1 + 1.5 * k)), area: Math.round(e.area * (1 + 0.6 * k)), count: e.count + Math.round(2 * k) };
    this.autoCastRaw(boosted);
    this.castLog.push({ id: sp.id, t: this.gameTimeSeconds }); this.noteCastForFusion(sp.id);
    sp.currentCooldown = sp.cooldown * (1 + 0.5 * k) * this.cdMul(sp.id);
    this.chargeLog.push({ id: sp.id, k });
    if (k > 0.25) {
      this.addCata(CATA_GAIN.chargeMin + (CATA_GAIN.chargeMax - CATA_GAIN.chargeMin) * k, 'charge'); sound.play('charge_release', 0.8 + 0.8 * k);
      this.shake(8 + 18 * k); this.hitStop = Math.max(this.hitStop, 0.07 * k);
      FX.ring(this.playerX, this.playerY - this.casterZ(), 120 + 120 * k, 'rgba(255,240,180,1)', 0.45);
      this.label(k >= 1 ? `MAX CHARGE: ${sp.name}!` : `CHARGED ${Math.round(k * 100)}%`, this.playerX, this.playerY - this.casterZ() - 90, sp.color, true);
    }
    return k;
  }

  // ---------- spirits ----------
  private spiritTotal(spellCount: number) { return Math.min(18, Math.min(12, spellCount) + 2 * this.art('firefly') + (this.art('twin_soul') ? 4 : 0)); }
  public spiritLost: number[] = []; // regrow times of spirits sacrificed by the lethal-hit save
  public spiritSave = { readyAt: 0, saves: 0 };
  public surge = { readyAt: 0, uses: 0, until: 0 };
  public spiritStats = { blocked: 0, healed: 0, magnet: 0, hunts: 0, beaconTicks: 0, surgeHits: 0, ascension: 0 };
  private beaconTick = 0;
  private syncSpirits() {
    const sp = this.spells.find((s) => s.id === 'spirit');
    const t = this.gameTimeSeconds; this.spiritLost = this.spiritLost.filter((r) => r > t);
    const n = Math.max(0, this.spiritTotal(sp ? sp.count : 0) - this.spiritLost.length);
    while (this.spirits.length < n) { const a = Math.random() * 6.28; this.spirits.push({ x: this.playerX + Math.cos(a) * 60, y: this.playerY + Math.sin(a) * 60, z: 0, dash: 0, tx: 0, ty: 0, target: null, dmg: 0 }); FX.flash(this.playerX, this.playerY, 40, '#5eead4'); }
    if (this.spirits.length > n) this.spirits.length = n;
    const asc = ascension(n);
    if (asc > this.spiritStats.ascension) { this.spiritStats.ascension = asc; this.notice(asc === 2 ? 'SPIRIT ASCENSION II — the swarm burns gold' : 'SPIRIT ASCENSION I — your spirits awaken', '#fde68a', 'spirit'); FX.star(this.playerX, this.playerY, 160); sound.play('levelup', 1.2); }
    for (let i = 0; i < n; i++) this.spirits[i].role = spiritRole(i, n);
  }
  public spiritState() {
    const n = this.spirits.length; const t = this.gameTimeSeconds; const asc = ascension(n);
    const roles: Record<string, number> = { guardian: 0, hunter: 0, mender: 0, beacon: 0 };
    for (const s of this.spirits) roles[s.role ?? 'guardian']++;
    const cdMax = SPIRIT.SURGE_CD * SPIRIT.ASC_SURGE_CD[asc];
    return { n, roles, asc, buffs: spiritBuffs(n), surgeCd: Math.max(0, this.surge.readyAt - t), surgeMax: cdMax, saveCd: Math.max(0, this.spiritSave.readyAt - t), saveReady: n >= SPIRIT.SAVE_MIN && t >= this.spiritSave.readyAt, lost: this.spiritLost.length, stats: { ...this.spiritStats, saves: this.spiritSave.saves, surges: this.surge.uses }, formation: this.airborne ? 'wing' : 'orbit' };
  }
  /** HUD button: every spirit dashes at a demon with boosted damage; guardians blast away nearby shots. */
  public spiritSurge() {
    const n = this.spirits.length; const t = this.gameTimeSeconds;
    if (!n || t < this.surge.readyAt || this.isPaused) return false;
    const asc = ascension(n); this.surge.readyAt = t + SPIRIT.SURGE_CD * SPIRIT.ASC_SURGE_CD[asc]; this.surge.uses++; this.surge.until = t + 0.8;
    const base = this.eff(this.spells.find((x) => x.id === 'spirit') ?? makeSpell('spirit', 1));
    const dmg = Math.round(base.damage * SPIRIT.SURGE_MUL * (this.stats.spellPower / 100));
    const used = new Set<Enemy>();
    for (const s of this.spirits) { const tg = this.enemies.filter((e) => !used.has(e) && Math.hypot(e.x - s.x, e.y - s.y) < 520).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0] ?? this.findNearestEnemy(s.x, s.y, 520); if (tg) { used.add(tg); s.target = tg; s.dash = 0.7; s.dmg = dmg; this.spiritStats.surgeHits++; } }
    const before = this.enemyShots.length; this.enemyShots = this.enemyShots.filter((b) => Math.hypot(b.x - this.playerX, b.y - this.playerY) > SPIRIT.SURGE_CLEAR_R); this.spiritStats.blocked += before - this.enemyShots.length;
    FX.ring(this.playerX, this.playerY, SPIRIT.SURGE_CLEAR_R, 'rgba(94,234,212,1)', 0.6); FX.star(this.playerX, this.playerY, 120);
    this.label('SPIRIT SURGE!', this.playerX, this.playerY - 110, '#5eead4', true); sound.play('spirit', 1.8); sound.play('wings', 1);
    return true;
  }
  /** Lethal-hit save: a spirit dies instead of you (needs SAVE_MIN spirits, SAVE_CD cooldown). */
  private trySpiritSave(): boolean {
    const t = this.gameTimeSeconds;
    if (this.spirits.length < SPIRIT.SAVE_MIN || t < this.spiritSave.readyAt) return false;
    this.spiritSave.readyAt = t + SPIRIT.SAVE_CD; this.spiritSave.saves++;
    this.spiritLost.push(t + SPIRIT.SAVE_REGROW); const s = this.spirits.pop()!;
    this.stats.hp = Math.max(1, Math.round(this.stats.maxHp * SPIRIT.SAVE_HP));
    this.enemyShots = this.enemyShots.filter((b) => Math.hypot(b.x - this.playerX, b.y - this.playerY) > 300);
    for (const e of this.enemies) { const dx = e.x - this.playerX, dy = e.y - this.playerY, d = Math.hypot(dx, dy) || 1; if (d < 220) { e.x += (dx / d) * (220 - d); e.y += (dy / d) * (220 - d); } }
    FX.flash(s.x, s.y, 80, '#ffffff'); FX.ring(this.playerX, this.playerY, 220, 'rgba(153,246,228,1)', 0.7);
    this.label('A SPIRIT SAVED YOU', this.playerX, this.playerY - 120, '#99f6e4', true); this.notice(`A spirit sacrificed itself — it returns in ${SPIRIT.SAVE_REGROW}s`, '#99f6e4', 'spirit'); sound.play('spirit', 2);
    this.syncSpirits(); return true;
  }
  private updateSpirits(dt: number) {
    this.syncSpirits();
    const n = this.spirits.length; if (!n) return;
    if (!this.spells.some((x) => x.id === 'spirit')) { this.spiritAuto -= dt; if (this.spiritAuto <= 0) { this.spiritAuto = 1.6; this.castSpirits(makeSpell('spirit', 1)); } }
    const t = this.gameTimeSeconds; const asc = ascension(n); const fly = this.airborne;
    const guards = this.spirits.filter((s) => s.role === 'guardian'); const hunters = this.spirits.filter((s) => s.role === 'hunter');
    const base = this.eff(this.spells.find((x) => x.id === 'spirit') ?? makeSpell('spirit', 1)); const sdmg = base.damage * (this.stats.spellPower / 100);
    const pz = this.casterZ() + 10;
    // facing for the flying wing formation
    const fa = this.playerAngle;
    for (let i = 0; i < n; i++) {
      const s = this.spirits[i];
      if (s.dash > 0 && s.target && s.target.hp > 0) {
        s.dash -= dt;
        const dx = s.target.x - s.x, dy = s.target.y - s.y, d = Math.hypot(dx, dy) || 1;
        const st = Math.min(d, (t < this.surge.until ? 1400 : 900) * dt); s.x += (dx / d) * st; s.y += (dy / d) * st; s.z += (0 - s.z) * Math.min(1, dt * 10);
        if (d < s.target.radius + 10) {
          this.damageEnemy(s.target, Math.round(s.dmg || 40), asc === 2 ? '#fde68a' : '#5eead4', 'arcane');
          FX.flash(s.target.x, s.target.y, 26, '#99f6e4'); this.spiritLog.strikes++; s.dash = 0; s.target = null;
        }
        continue;
      }
      s.dash = 0;
      let ox: number, oy: number;
      if (fly) { // wing formation: V behind the caster, mirrored left/right
        const k = Math.floor(i / 2) + 1; const side = i % 2 ? 1 : -1;
        const back = 34 + k * 26, spread = 30 + k * 30;
        ox = this.playerX - Math.cos(fa) * back + Math.cos(fa + Math.PI / 2) * spread * side;
        oy = this.playerY - Math.sin(fa) * back + Math.sin(fa + Math.PI / 2) * spread * side;
      } else if (s.role === 'guardian') { const gi = guards.indexOf(s); const a = t * 2.4 + (gi / Math.max(1, guards.length)) * Math.PI * 2; ox = this.playerX + Math.cos(a) * SPIRIT.GUARD_R; oy = this.playerY + Math.sin(a) * SPIRIT.GUARD_R * 0.8; }
      else if (s.role === 'hunter') { const hi = hunters.indexOf(s); const a = -t * 1.2 + (hi / Math.max(1, hunters.length)) * Math.PI * 2; ox = this.playerX + Math.cos(a) * SPIRIT.HUNT_R; oy = this.playerY + Math.sin(a) * SPIRIT.HUNT_R * 0.8; }
      else if (s.role === 'mender') { ox = this.playerX; oy = this.playerY - 44; }
      else { ox = this.playerX + Math.cos(t) * 12; oy = this.playerY + 30; }
      const lag = Math.min(1, dt * (fly ? 7 : 5));
      s.x += (ox - s.x) * lag; s.y += (oy - s.y) * lag;
      s.z += (pz + (fly ? 6 : 0) - s.z) * lag;
      // role behaviour
      if (s.role === 'hunter') { s.hcd = (s.hcd ?? Math.random()) - dt; if (s.hcd <= 0) { s.hcd = SPIRIT.HUNT_EVERY; const tg = this.findNearestEnemy(s.x, s.y, SPIRIT.HUNT_RANGE); if (tg) { s.target = tg; s.dash = 0.6; s.dmg = Math.round(sdmg); this.spiritStats.hunts++; } } }
      else if (s.role === 'guardian') {
        for (let j = this.enemyShots.length - 1; j >= 0; j--) { const b = this.enemyShots[j]; if (Math.hypot(b.x - s.x, b.y - s.y) < SPIRIT.BLOCK_R + b.r) { FX.flash(b.x, b.y, 24, '#93c5fd'); this.enemyShots.splice(j, 1); this.spiritStats.blocked++; } }
      } else if (s.role === 'mender') {
        if (this.stats.hp < this.stats.maxHp) { const h = Math.min(this.stats.maxHp - this.stats.hp, this.stats.maxHp * SPIRIT.MENDER_HPS * dt * (1 + 0.5 * asc)); this.stats.hp += h; this.spiritStats.healed += h; }
        for (const it of this.lootItems) if (!it.magnetized && Math.hypot(it.x - this.playerX, it.y - this.playerY) < SPIRIT.MENDER_MAGNET * (1 + 0.25 * asc)) { it.magnetized = true; this.spiritStats.magnet++; }
      }
    }
    if (n >= SPIRIT.BEACON_AT) {
      this.beaconTick -= dt; const R = SPIRIT.BEACON_R * (1 + 0.25 * asc);
      for (const e of this.enemies) { const dx = e.x - this.playerX, dy = e.y - this.playerY; if (dx * dx + dy * dy < R * R) { e.beaconUntil = t + 0.25; } }
      if (this.beaconTick <= 0) { this.beaconTick = 0.5; this.spiritStats.beaconTicks++; for (const e of this.enemies) if ((e.beaconUntil ?? 0) > t) this.damageEnemy(e, Math.max(1, Math.round(sdmg * SPIRIT.BEACON_DPS * 0.5)), '#facc15', 'arcane'); }
    }
  }
  private castSpirits(spell: Spell) {
    this.syncSpirits();
    const dmg = Math.round(spell.damage * (this.stats.spellPower / 100));
    const big = spell.damage > this.eff(this.spells.find((x) => x.id === 'spirit') ?? spell).damage * 1.2; // charged or fused
    for (let i = 0; i < this.spirits.length; i++) {
      const s = this.spirits[i];
      const target = this.findNearestEnemy(s.x, s.y, 420);
      if (!target) continue;
      const d = Math.hypot(target.x - s.x, target.y - s.y);
      s.dmg = dmg;
      if (d < 170 || big) { s.dash = 0.5; s.target = target; }
      else if (this.projectiles.length < 200) {
        const a = Math.atan2(target.y - s.y, target.x - s.x);
        this.projectiles.push({ id: `proj_${Math.random()}`, x: s.x, y: s.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, radius: 7, damage: dmg, color: '#5eead4', trailColor: '#99f6e4', duration: 1.6, life: 0, pierce: 1, hitEnemies: new Set(), type: 'spirit_bolt', homingTarget: target, z: s.z + 18, z0: s.z + 18 });
        this.spiritLog.bolts++;
      }
    }
    if (this.spirits.length) sound.play('spirit', Math.min(1.6, 0.6 + this.spirits.length * 0.08));
  }



  private uiSec = -1; private uiTimer = 0; private lootTimer = 1;
  public lootMerged = 0;
  /** v6: keep pickups bounded — merge surplus gems/coins into their nearest same-type neighbour (value adds up). */
  public static LOOT_CAP: Record<string, number> = { xp: 90, gold: 70, crystal: 40, chest: 6 };
  private compactLoot() {
    const L = this.lootItems; const by: Record<string, LootItem[]> = {};
    for (const l of L) (by[l.type] ??= []).push(l);
    for (const type of Object.keys(by)) {
      const arr = by[type]; const cap = GameEngine.LOOT_CAP[type] ?? 60; if (arr.length <= cap) continue;
      const px = this.playerX, py = this.playerY;
      arr.sort((a, b) => Math.hypot(b.x - px, b.y - py) - Math.hypot(a.x - px, a.y - py)); // farthest first
      const extra = arr.length - cap;
      for (let i = 0; i < extra; i++) {
        const a = arr[i];
        if (type === 'chest') { a.type = 'gold'; a.value = 250; a.color = '#eab308'; continue; }
        let best: LootItem | null = null, bd = 1e18;
        for (let j = extra; j < arr.length; j++) { const b = arr[j]; const d = (b.x - a.x) ** 2 + (b.y - a.y) ** 2; if (d < bd) { bd = d; best = b; } }
        if (best) { best.value += a.value; best.merged = (best.merged ?? 1) + (a.merged ?? 1); a.value = -1; this.lootMerged++; }
      }
    }
    compact(L, (q) => q.value >= 0);
  }
  private capLogs() {
    for (const k of ['fusionLog', 'chestLog', 'flightLog', 'comboLog', 'chargeLog', 'castLog'] as const) { const a = this[k] as unknown[]; if (a.length > 240) a.splice(0, a.length - 200); }
  }

  // ---------- v6 perf instrumentation ----------
  /** Lengths of every array / Map / Set reachable on the engine (and weather), for soak tests. */
  public perfStats() {
    const out: Record<string, number> = {};
    const scan = (o: Record<string, unknown>, pre: string) => { for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v)) out[pre + k] = v.length; else if (v instanceof Map || v instanceof Set) out[pre + k] = v.size; } };
    scan(this as unknown as Record<string, unknown>, ''); scan(this.weatherSystem as unknown as Record<string, unknown>, 'weather.');
    out['fx.active'] = FX.active();
    return out;
  }
  /** Advance the simulation n fixed steps without rendering (debug fast-forward). Returns avg update ms. */
  public soakSteps(n: number, dt = 1 / 30) { const t0 = performance.now(); for (let i = 0; i < n; i++) { this.update(dt); FX.tick(dt); } return (performance.now() - t0) / Math.max(1, n); }
  public soakRender(n: number) { const t0 = performance.now(); for (let i = 0; i < n; i++) this.render(); return (performance.now() - t0) / Math.max(1, n); }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    sound.startAtmosphereMusic();
    this.loop(this.lastTime);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
    }
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animId);
    sound.stopAtmosphereMusic();
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('msd:tap', this.onTap as EventListener);
  }

  /** 0/1/2 render LOD: driven by crowd size + smoothed real frame interval (includes raster time), with hysteresis. */
  /** v6 interactive background */
  public ibg = new InteractiveBg(); private lastZoom = 1;
  private onTap = (e: CustomEvent<{ x: number; y: number }>) => { const w = this.screenToWorld(e.detail.x, e.detail.y); this.ibg.tap(w.x, w.y); };
  public screenToWorld(sx: number, sy: number) { const z = this.lastZoom; return { x: this.cameraX + (sx - window.innerWidth / 2) / z, y: this.cameraY + (sy - window.innerHeight / 2) / (z * 0.88) }; }
  private ibgReward = (x: number, y: number, kind: 'xp' | 'gold') => { this.lootItems.push({ id: `ibg_${Math.random()}`, x, y, type: kind, value: kind === 'xp' ? IBG.REWARD_XP : IBG.REWARD_GOLD, color: kind === 'xp' ? '#818cf8' : '#eab308', bobOffset: Math.random() * 6.28 }); };
  private ibgSfx = (n: string) => sound.play(n, 0.7);
  private ibgSceneId() { const c = this.cata; return (c.phase === 'scene' || c.phase === 'collapse') && c.kind ? c.kind : this.region.id; }
  public ibgState() { return { ...this.ibg.state(), gfx: GFX.interactiveBg }; }
  public lod = 0; public reducedEffects = false; private frameEma = 16; private lodHold = 0;
  public static LOD_ENEMIES = [95, 140];
  private updateLod(frameMs: number) {
    this.frameEma += (Math.min(100, frameMs) - this.frameEma) * 0.05;
    const n = this.enemies.length + this.particles.length * 0.15 + this.magic2.active * 0.35;
    let want = n >= GameEngine.LOD_ENEMIES[1] ? 2 : n >= GameEngine.LOD_ENEMIES[0] ? 1 : 0;
    if (this.frameEma > 26) want = Math.min(2, want + 1);
    if (this.frameEma > 45) want = 2;
    if (this.reducedEffects || GFX.reducedEffects) want = Math.max(1, want);
    if (want > this.lod) { this.lod = want; this.lodHold = 2; } else if (want < this.lod && (this.lodHold -= frameMs / 1000) <= 0) { this.lod = want; this.lodHold = 2; }
    Q.lod = this.lod; this.magic2.budget = this.lod >= 2 ? 110 : this.lod === 1 ? 170 : 220;
    this.applyRenderScale();
  }
  public setReducedEffects(v: boolean) { this.reducedEffects = v; }
  private loop = (time: number) => {
    if (!this.isRunning) return;
    this.updateLod(time - this.lastTime);
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    const t0 = performance.now();
    if (!this.isPaused) {
      this.update(dt);
    }
    this.render();
    this.frameTimes.push(performance.now() - t0);
    if (this.frameTimes.length > 600) this.frameTimes.shift();

    this.animId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); if (this.enableHitStop) dt *= 0.15; }
    this.gameTimeSeconds += dt;
    this.updateFlight(dt);
    this.fusionCd = Math.max(0, this.fusionCd - dt);
    for (const k in this.pairCd) if (this.pairCd[k] > 0) this.pairCd[k] = Math.max(0, this.pairCd[k] - dt);
    for (const l of this.labels) l.life -= dt; compact(this.labels, (q) => q.life > 0); if (this.labels.length > 24) this.labels.splice(0, this.labels.length - 24);
    for (const b of this.beams) b.life -= dt; compact(this.beams, (q) => q.life > 0);
    this.magic2.h.enemies = this.enemies; this.magic2.update(dt);

    const mins = Math.floor(this.gameTimeSeconds / 60);
    const secs = Math.floor(this.gameTimeSeconds % 60);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const secNow = Math.floor(this.gameTimeSeconds);
    const secChanged = secNow !== this.uiSec; this.uiSec = secNow;
    if (secChanged) this.callbacks.onWaveUpdate(this.currentWave, this.targetEnemiesThisWave, timeStr);

    // Survival Milestone check: 15:00 mark (900 seconds) required by the containment protocol
    if (false as boolean) {
      this.milestoneTriggered = true;
      this.pause();
      this.callbacks.onSurvivalMilestone?.(timeStr, this.currentWave, this.enemiesDefeated);
    }

    if (secChanged) this.callbacks.onQuestUpdate((prev) =>
      prev.map((q) => (q.id === 'q3' ? { ...q, current: Math.min(q.target, Math.floor(this.gameTimeSeconds)) } : q))
    );

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    if (this.stats.dashCurrentCooldown > 0) {
      this.stats.dashCurrentCooldown = Math.max(0, this.stats.dashCurrentCooldown - dt);
    }

    this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 15 * dt);
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + (8 + 3 * this.art('amber')) * dt);

    // Spells Update
    // Passive magic: every owned spell auto-fires when ready, staggered by a global cast gap.
    this.castGapTimer = Math.max(0, this.castGapTimer - dt);
    let ready: Spell | null = null;
    for (const spell of this.spells) {
      if (spell.currentCooldown > 0) spell.currentCooldown = Math.max(0, spell.currentCooldown - dt);
      else if (!ready && !(this.charging && this.charging.id === spell.id)) ready = spell;
    }
    if (ready && this.castGapTimer <= 0) {
      this.autoCast(ready);
      // rotate so the next ready spell gets priority (fair alternation)
      const i = this.spells.indexOf(ready);
      this.spells.push(...this.spells.splice(i, 1));
    }

    // Central Sigil Wave pulse
    this.centralSigilTimer += dt;
    if (this.centralSigilTimer >= 5.5) {
      this.centralSigilTimer = 0;
      this.triggerCentralSigilSurge();
    }

    // Player Movement
    let mx = this.joystickVector.x;
    let my = this.joystickVector.y;
    if (mx === 0 && my === 0) {
      if (this.keys['w'] || this.keys['arrowup']) my -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) my += 1;
      if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) mx += 1;
    }
    const moveLen = Math.hypot(mx, my);
    if (moveLen > 0 && !this.pullBack) {
      const fly = !this.airborne ? 1 : (this.alt === 'soar' ? SOAR_SPEED : HOVER_SPEED) * (1 + 0.12 * this.art('wing_feather'));
      const speed = this.stats.speed * 60 * (this.gameTimeSeconds < this.slowUntil ? 0.6 : 1) * fly;
      const mag = Math.min(1, moveLen); // analog joystick; keys give 1
      this.playerX += (mx / moveLen) * speed * mag * dt;
      this.playerY += (my / moveLen) * speed * mag * dt;
      this.playerAngle = Math.atan2(my, mx);
      const target = Math.atan2(my, mx);
      let diff = target - this.faceAngle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.faceAngle += diff * Math.min(1, dt * 14);
      this.moveAmt = Math.min(1, this.moveAmt + dt * 5);
    } else if (this.mouseAim.x !== 0 || this.mouseAim.y !== 0) {
      this.playerAngle = Math.atan2(this.mouseAim.y, this.mouseAim.x);
    }

    if (moveLen === 0) this.moveAmt = Math.max(0, this.moveAmt - dt * 4);

    // v7: endless world — no bounds; only origin rebasing for float precision
    this.applyBounds(dt);

    // Dynamic camera tracking with subtle directional lead for enhanced POV
    const leadX = (mx || (this.keys['d'] ? 1 : this.keys['a'] ? -1 : 0)) * 55;
    const leadY = (my || (this.keys['s'] ? 1 : this.keys['w'] ? -1 : 0)) * 45;
    this.cameraX += (this.playerX + leadX - this.cameraX) * 0.08;
    this.cameraY += (this.playerY + leadY - this.cameraY) * 0.08;

    // Update dynamic atmospheric weather simulation & check wave transition
    this.weatherSystem.update(dt, this.cameraX, this.cameraY);
    const weatherAlert = this.weatherSystem.setWeatherForWave(this.currentWave);
    if (weatherAlert && this.callbacks.onWeatherChange) {
      this.callbacks.onWeatherChange(weatherAlert);
    }

    this.updateDeep(dt);
    this.ibg.enabled = GFX.interactiveBg;
    if (this.ibg.enabled) { this.ibg.setScene(this.ibgSceneId()); this.ibg.update(dt, this.gameTimeSeconds, this.playerX, this.playerY, this.origin, this.ibgReward, this.ibgSfx); }
    if (this.stats.hp <= 0) { this.handlePlayerDeath(); if (this.stats.hp <= 0) return; }

    // Spawn regular hordes (region roster / endless scaling)
    this.spawnTimer += dt;
    const df = this.diff();
    const cp = this.cata.phase;
    if (cp === 'scene' && this.spawnTimer >= SCENES[this.cata.kind!].spawn && this.enemies.length < df.cap) { this.spawnTimer = 0; this.spawnSceneEnemy(); }
    else if ((cp === 'idle' || cp === 'crack') && this.spawnTimer >= df.spawn && this.enemies.length < df.cap) {
      this.spawnTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      const dist = this.offDist() + Math.random() * 160;
      let roll = Math.random();
      const roster = this.region.roster;
      let type = roster[0][0];
      for (const [t, w] of roster) { if (roll < w) { type = t; break; } roll -= w; }
      const sx = this.playerX + Math.cos(angle) * dist, sy = this.playerY + Math.sin(angle) * dist;
      const sp2 = this.clampSpawn(sx, sy);
      let t2 = type;
      if (this.inEndless && Math.random() < Math.min(0.4, 0.05 * (this.endlessTime / 60))) t2 = NEW_ENEMY_TYPES[Math.floor(Math.random() * NEW_ENEMY_TYPES.length)] as Enemy['type'];
      this.spawnEnemyAt(t2, sp2.x, sp2.y);
    }
    this.packTimer -= dt;
    if (this.packTimer <= 0 && !this.currentBoss && cp === 'idle') { this.packTimer = this.inEndless ? PACK_EVERY_ENDLESS : PACK_EVERY_REGION; if (this.enemies.length < df.cap + 20) this.spawnPack(); }
    this.eliteTimer -= dt;
    if (this.eliteTimer <= 0 && cp === 'idle') {
      this.eliteTimer = ELITE_EVERY;
      const roster = this.region.roster; const t = roster[Math.floor(Math.random() * roster.length)][0];
      const a = Math.random() * 6.28; const d = this.offDist() + 40;
      const ep = this.clampSpawn(this.playerX + Math.cos(a) * d, this.playerY + Math.sin(a) * d);
      this.spawnEnemyAt(t, ep.x, ep.y, { elite: true });
    }
    this.updateEnemyShots(dt);
    this.updateSpirits(dt);
    if (this.stats.hp <= 0) { this.handlePlayerDeath(); if (this.stats.hp <= 0) return; }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.frozenUntil && performance.now() < e.frozenUntil) {
        // frozen in ice block
      } else {
        const dx = this.playerX - e.x;
        const dy = this.playerY - e.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (e.isBoss) {
          e.x += (dx / dist) * e.speed * 60 * dt;
          e.y += (dy / dist) * e.speed * 60 * dt;

          if (e.attackCooldown !== undefined) {
            e.attackCooldown -= dt;
            if (e.attackCooldown <= 0) {
              e.attackCooldown = 4.2;
              this.triggerBossSlam(e);
            }
          }
        } else {
          let slowK = 1;
          for (const z of this.zones) if (z.steam && Math.hypot(e.x - z.x, e.y - z.y) < z.r) { slowK = 0.45; break; }
          if ((e.slowUntil ?? 0) > this.gameTimeSeconds) slowK = Math.min(slowK, 0.5);
          this.moveEnemy(e, dx, dy, dist, dt, slowK);
        }

        // Damage Player
        const groundOnly = !e.isBoss && !e.flying;
        if (dist < e.radius + 18 && !this.stats.isDashing && !(groundOnly && this.airborne) && e.hp > 0) {
          const dmg = (e.damage * dt) / 0.35 * (e.state === 2 && (ENEMY_DEFS[e.type]?.behavior === 'charger') ? 2 : 1);
          if (this.stats.mana > dmg * 0.7) {
            this.stats.mana -= dmg * 0.7;
            this.hurt(dmg * 0.3);
          } else {
            this.hurt(dmg);
          }
          if (Math.random() < 0.12) {
            sound.playHit();
            this.screenShake = 4;
          }

          if (this.stats.hp <= 0) {
            this.handlePlayerDeath();
            return;
          }
        }
      }

      if (e.hp <= 0) {
        this.killEnemy(e, i);
      }
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;

      if (p.z) p.z = Math.max(0, p.z - (p.z0 ?? p.z) * dt * 3);
      if ((p.type === 'arcane_missile' || p.type === 'spirit_bolt') && (!p.homingTarget || p.homingTarget.hp <= 0)) {
        p.homingTarget = this.findNearestEnemy(p.x, p.y, 450);
      }
      if (p.homingTarget && p.homingTarget.hp > 0) {
        const dx = p.homingTarget.x - p.x;
        const dy = p.homingTarget.y - p.y;
        const ang = Math.atan2(dy, dx);
        p.vx += Math.cos(ang) * 50;
        p.vy += Math.sin(ang) * 50;
        const spd = Math.hypot(p.vx, p.vy);
        const maxSpd = 520;
        if (spd > maxSpd) {
          p.vx = (p.vx / spd) * maxSpd;
          p.vy = (p.vy / spd) * maxSpd;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Particle sparks
      if (Math.random() < 0.7) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: -p.vx * 0.15 + (Math.random() - 0.5) * 20,
          vy: -p.vy * 0.15 + (Math.random() - 0.5) * 20,
          size: Math.random() * 4 + 2,
          color: p.trailColor,
          alpha: 0.9,
          life: 0.22,
          maxLife: 0.22,
          shape: 'spark',
        });
      }

      // Hit detection
      for (const enemy of this.enemies) {
        if (!p.hitEnemies.has(enemy.id)) {
          const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
          if (dist < p.radius + enemy.radius) {
            p.hitEnemies.add(enemy.id);
            this.damageEnemy(enemy, p.damage, p.color, p.type === 'frost_shard' ? 'ice' : 'arcane');
            if (p.type === 'frost_shard') enemy.frozenUntil = performance.now() + 1500;
            if (p.type === 'arcane_missile') {
              if (this.hasSyn('prism')) enemy.frozenUntil = performance.now() + 600;
              if (this.hasSyn('hexflame') && Math.random() < 0.35) this.addZone(enemy.x, enemy.y, 45, 1.6, p.damage * 0.5, '244,114,182');
              if (this.hasSyn('conduit') && Math.random() < 0.25) { FX.bolt(enemy.x, enemy.y); this.damageEnemy(enemy, p.damage, '#93c5fd', 'lightning'); }
              if (p.split === false && this.projectiles.length < 200) {
                for (const s2 of [-0.8, 0.8]) {
                  const a2 = Math.atan2(p.vy, p.vx) + s2;
                  this.projectiles.push({ ...p, id: `proj_${Math.random()}`, vx: Math.cos(a2) * 380, vy: Math.sin(a2) * 380, radius: 6, damage: Math.round(p.damage * 0.5), pierce: 1, life: 0, duration: 1.2, split: true, hitEnemies: new Set([enemy.id]), homingTarget: null });
                }
              }
            }
            p.pierce--;

            for (let k = 0; k < 8; k++) {
              this.particles.push({
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                size: Math.random() * 5 + 2,
                color: p.color,
                alpha: 1,
                life: 0.3,
                maxLife: 0.3,
                shape: 'spark',
              });
            }

            if (p.pierce <= 0) {
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }

      if (p.life >= p.duration && this.projectiles[i] === p) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Loot
    const pickupRad = this.stats.pickupRadius;
    for (let i = this.lootItems.length - 1; i >= 0; i--) {
      const item = this.lootItems[i];
      const dx = this.playerX - item.x;
      const dy = this.playerY - item.y;
      const dist = Math.hypot(dx, dy);

      if (item.type === 'chest') { if (dist < 46) { this.collectLoot(item); item.value = -1; } continue; }
      if (dist < pickupRad || item.magnetized) {
        item.magnetized = true;
        const spd = 480;
        item.x += (dx / dist) * spd * dt;
        item.y += (dy / dist) * spd * dt;
      }

      if (dist < 32) {
        this.collectLoot(item);
        item.value = -1;
      }
    }
    compact(this.lootItems, (q) => q.value >= 0);

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.alpha = Math.max(0, part.life / part.maxLife);
    }
    compact(this.particles, (q) => q.life > 0);

    // Update Damage Numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      dn.y += dn.vy * dt;
      dn.alpha = Math.max(0, dn.life / dn.maxLife);
    }
    compact(this.damageNumbers, (q) => q.life > 0);

    // v6: UI callbacks throttled to ~12 Hz (they re-render the React tree)
    this.uiTimer -= dt;
    if (this.uiTimer <= 0) {
      this.uiTimer = 0.083;
      const en: { x: number; y: number; isBoss?: boolean }[] = []; const cr: { x: number; y: number }[] = [];
      for (const e of this.enemies) en.push({ x: e.x, y: e.y, isBoss: e.isBoss });
      for (const l of this.lootItems) if (l.type === 'crystal') cr.push({ x: l.x, y: l.y });
      this.callbacks.onRadarUpdate({ playerX: this.playerX, playerY: this.playerY, arenaRadius: 900, worldX: this.playerX + this.origin.x, worldY: this.playerY + this.origin.y, spawnX: -this.origin.x, spawnY: -this.origin.y, enemies: en, crystals: cr });
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
    this.lootTimer -= dt; if (this.lootTimer <= 0) { this.lootTimer = 1; this.compactLoot(); }
    this.capLogs();
  }

  private triggerCentralSigilSurge() {
    sound.playFrostNova();
    FX.ring(0, 0, 220, 'rgba(80,200,255,1)', 0.6);
    for (let i = 0; i < 60; i++) {
      const ang = (i / 60) * Math.PI * 2;
      this.particles.push({
        x: Math.cos(ang) * 150,
        y: Math.sin(ang) * 150,
        vx: Math.cos(ang) * 140,
        vy: Math.sin(ang) * 140,
        size: 5,
        color: '#38bdf8',
        alpha: 1,
        life: 0.6,
        maxLife: 0.6,
        shape: 'spark',
      });
    }

    this.enemies.forEach((e) => {
      if (Math.hypot(e.x, e.y) < 220) {
        this.damageEnemy(e, 580, '#38bdf8');
      }
    });
  }

  private triggerBossSlam(boss: Enemy) {
    sound.playBossRoar();
    FX.ring(boss.x, boss.y, 280, 'rgba(255,90,20,1)', 0.7);
    this.screenShake = 16;
    for (let i = 0; i < 45; i++) {
      const ang = (i / 45) * Math.PI * 2;
      this.particles.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(ang) * 280,
        vy: Math.sin(ang) * 280,
        size: 7,
        color: '#f97316',
        alpha: 1,
        life: 0.75,
        maxLife: 0.75,
        shape: 'spark',
      });
    }

    const dist = Math.hypot(this.playerX - boss.x, this.playerY - boss.y);
    if (dist < 280 && !this.stats.isDashing) {
      this.hurt(240);
      sound.playHit();
      this.spawnFloatingText('-240 Boss Shockwave!', this.playerX, this.playerY - 40, '#ef4444');
    }
  }

  private sfxSize(sp: Spell) { return Math.min(2, 0.75 + 0.25 * (sp.tier ?? 0) + Math.min(0.5, sp.level * 0.05) + (sp.damage > (BASE_SPELLS[sp.id]?.damage ?? sp.damage) * 4 ? 0.3 : 0)); }
  private castArcaneMissiles(spell: Spell) {
    sound.play('arcane', this.sfxSize(spell));
    const count = spell.count;
    const nearest = this.findNearestEnemy(this.playerX, this.playerY, 520);

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.3;
      const baseAngle = nearest
        ? Math.atan2(nearest.y - this.playerY, nearest.x - this.playerX)
        : this.playerAngle;
      const angle = baseAngle + spread;
      const speed = 440;

      this.projectiles.push({
        id: `proj_${Math.random()}`,
        x: this.playerX,
        y: this.playerY,
        z: this.casterZ() + (this.flyH > 0.1 ? 30 : 0), z0: this.casterZ() + (this.flyH > 0.1 ? 30 : 0),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 8 + 4 * (spell.tier ?? 0),
        damage: Math.round(spell.damage * (this.stats.spellPower / 100)),
        color: (spell.tier ?? 0) > 0 ? spell.color : '#38bdf8',
        trailColor: (spell.tier ?? 0) > 0 ? '#a855f7' : '#60a5fa',
        duration: 2.2,
        life: 0,
        pierce: 1 + 2 * (spell.tier ?? 0),
        split: (spell.tier ?? 0) >= 2 ? false : undefined,
        hitEnemies: new Set(),
        type: 'arcane_missile',
        homingTarget: nearest,
      });
    }
  }

  private castFrostNova(spell: Spell) {
    sound.play('ice', this.sfxSize(spell));
    FX.star(this.playerX, this.playerY, spell.area);
    this.screenShake = 6;
    const radius = spell.area;
    const damage = Math.round(spell.damage * (this.stats.spellPower / 100));

    const shards = spell.count;
    const off = Math.random() * Math.PI * 2;
    for (let i = 0; i < shards; i++) {
      const a = off + (i / shards) * Math.PI * 2;
      this.projectiles.push({
        id: `proj_${Math.random()}`,
        x: this.playerX, y: this.playerY, z: this.casterZ(), z0: this.casterZ(),
        vx: Math.cos(a) * 360, vy: Math.sin(a) * 360,
        radius: 7 + 4 * (spell.tier ?? 0), damage, color: (spell.tier ?? 0) > 0 ? spell.color : '#bae6fd', trailColor: (spell.tier ?? 0) > 0 ? '#e0f2fe' : '#93c5fd',
        duration: 0.9 + 0.2 * (spell.tier ?? 0), life: 0, pierce: 1 + 2 * (spell.tier ?? 0), hitEnemies: new Set(), type: 'frost_shard',
      });
    }
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      this.particles.push({
        x: this.playerX,
        y: this.playerY,
        vx: Math.cos(ang) * (radius / 0.35),
        vy: Math.sin(ang) * (radius / 0.35),
        size: Math.random() * 5 + 3,
        color: '#bae6fd',
        alpha: 1,
        life: 0.45,
        maxLife: 0.45,
        shape: 'shard',
      });
    }

    this.enemies.forEach((e) => {
      const dist = Math.hypot(e.x - this.playerX, e.y - this.playerY);
      const zr = (spell.tier ?? 0) >= 2 ? radius * 2.5 : radius;
      if (dist <= zr) {
        e.frozenUntil = performance.now() + ((spell.tier ?? 0) >= 2 ? 2500 : 1200);
        this.damageEnemy(e, Math.round(damage * 0.5), '#93c5fd', 'ice');
      }
    });
    if ((spell.tier ?? 0) >= 2) FX.ring(this.playerX, this.playerY, radius * 2.5, 'rgba(224,242,254,1)', 0.7);
  }

  private castThunderstorm(spell: Spell) {
    sound.play('thunder', this.sfxSize(spell));
    this.screenShake = 9;
    const damage = Math.round(spell.damage * (this.stats.spellPower / 100));

    for (let c = 0; c < spell.count; c++) {
      const target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      const tx = target ? target.x : this.playerX + (Math.random() - 0.5) * 400;
      const ty = target ? target.y : this.playerY + (Math.random() - 0.5) * 400;
      FX.bolt(tx, ty); this.skyStrike(tx, ty, '#fde047');
      if ((spell.tier ?? 0) > 0) FX.ring(tx, ty, spell.area, (spell.tier ?? 0) >= 2 ? 'rgba(253,224,71,1)' : 'rgba(103,232,249,1)', 0.35);
      if (this.hasSyn('plasma')) this.addZone(tx, ty, spell.area * 0.6, 2, damage * 0.4, '255,120,40');

      for (let i = 0; i < 22; i++) {
        this.particles.push({
          x: tx + (Math.random() - 0.5) * 40,
          y: ty - 380 + i * 18,
          vx: (Math.random() - 0.5) * 60,
          vy: 60,
          size: Math.random() * 6 + 3,
          color: '#60a5fa',
          alpha: 1,
          life: 0.35,
          maxLife: 0.35,
          shape: 'spark',
        });
      }

      let hit = 0;
      this.enemies.forEach((e) => {
        if (hit < 6 && Math.hypot(e.x - tx, e.y - ty) < spell.area) {
          hit++;
          this.damageEnemy(e, damage, (spell.tier ?? 0) >= 2 ? '#fde047' : '#60a5fa', 'lightning');
          if (this.hasSyn('chainfreeze')) e.frozenUntil = performance.now() + 600;
          if ((spell.tier ?? 0) >= 2) e.frozenUntil = Math.max(e.frozenUntil ?? 0, performance.now() + 400);
        }
      });
      const chains = (spell.tier ?? 0) === 0 ? 0 : (spell.tier === 1 ? 2 : 4);
      let cx = tx, cy = ty; const seen = new Set<string>(target ? [target.id] : []);
      for (let k = 0; k < chains; k++) {
        let best: Enemy | null = null, bd = 240;
        for (const e of this.enemies) { if (seen.has(e.id)) continue; const d = Math.hypot(e.x - cx, e.y - cy); if (d < bd) { bd = d; best = e; } }
        if (!best) break;
        seen.add(best.id); FX.bolt(best.x, best.y);
        this.damageEnemy(best, Math.round(damage * 0.7), spell.color, 'lightning');
        cx = best.x; cy = best.y;
      }
    }
  }

  private castCataclysm(spell: Spell) {
    sound.play('fire', this.sfxSize(spell));
    this.screenShake = 18;
    const damage = Math.round(spell.damage * (this.stats.spellPower / 100));

    for (let burst = 0; burst < Math.max(1, spell.count); burst++) {
    const target = burst === 0 ? this.findDensestCluster(400) : this.enemies[Math.floor(Math.random() * this.enemies.length)];
    const tx = target ? target.x : this.playerX + (Math.random() - 0.5) * 320;
    const ty = target ? target.y : this.playerY + (Math.random() - 0.5) * 320;
    FX.fire(tx, ty, spell.area); this.skyStrike(tx, ty, '#fb923c');

    for (let i = 0; i < 65; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 300 + 80;
      this.particles.push({
        x: tx,
        y: ty,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: Math.random() * 8 + 3,
        color: Math.random() < 0.5 ? '#f97316' : '#ef4444',
        alpha: 1,
        life: 0.7,
        maxLife: 0.7,
        shape: 'spark',
      });
    }

    this.enemies.forEach((e) => {
      const dist = Math.hypot(e.x - tx, e.y - ty);
      if (dist <= spell.area) {
        this.damageEnemy(e, damage, '#f97316', 'fire');
      }
    });
    if ((spell.tier ?? 0) > 0) {
      this.addZone(tx, ty, spell.area * ((spell.tier ?? 0) >= 2 ? 0.95 : 0.75), 3, damage * 0.35, (spell.tier ?? 0) >= 2 ? '244,63,94' : '251,146,60');
      FX.ring(tx, ty, spell.area * 1.15, (spell.tier ?? 0) >= 2 ? 'rgba(244,63,94,1)' : 'rgba(251,146,60,1)', 0.6);
    }
    }
  }

  private damageEnemy(enemy: Enemy, baseDamage: number, color: string, el?: Element, fx = true) {
    const isCrit = Math.random() * 100 < this.stats.critChance;
    let mult = 1;
    const frozen = !!(enemy.frozenUntil && performance.now() < enemy.frozenUntil);
    if (el === 'fire' && frozen) { if (this.hasSyn('thermal')) mult *= 1.6; enemy.frozenUntil = 0; if (!this.zones.some((z) => z.steam && Math.hypot(z.x - enemy.x, z.y - enemy.y) < z.r)) this.addSteam(enemy.x, enemy.y, 90, 3, 12); }
    if (el === 'lightning' && frozen && this.hasSyn('chainfreeze')) mult *= 2;
    mult *= this.flightDmgMul();
    { const ar = ENEMY_DEFS[enemy.type]?.armor; if (ar && !enemy.small) mult *= 1 - ar; }
    if ((enemy.isBoss || enemy.elite || enemy.type === 'void_knight') && this.art('slayer')) mult *= 1 + 0.35 * this.art('slayer');
    const finalDamage = Math.round((isCrit ? baseDamage * this.stats.critMultiplier : baseDamage) * mult);
    if (!fx) { enemy.hp -= finalDamage; this.totalDamageDealt += finalDamage; return; }

    enemy.hp -= finalDamage;
    if (this.ibg.enabled) this.ibg.hitAt(enemy.x, enemy.y, 50, this.gameTimeSeconds, this.ibgReward, this.ibgSfx);
    if (enemy.isBoss) sound.play('boss_hit', isCrit ? 1.3 : 0.9);
    FX.flash(enemy.x, enemy.y - enemy.radius * 0.5, enemy.radius * (isCrit ? 2.4 : 1.6), color);
    enemy.hitFlash = performance.now() + 100;
    this.totalDamageDealt += finalDamage;

    if (this.showDamageNumbers) {
      this.addDamageNumber(enemy.x, enemy.y, finalDamage, isCrit);
    }
  }

  private addDamageNumber(x: number, y: number, damage: number, isCrit: boolean) {
    this.damageNumbers.push({
      id: `dn_${Math.random()}`,
      x: x + (Math.random() - 0.5) * 22,
      y: y - 10,
      damage,
      isCrit,
      color: isCrit ? '#fbbf24' : '#ffffff',
      alpha: 1,
      life: 0.9,
      maxLife: 0.9,
      vy: isCrit ? -55 : -40,
    });
  }

  private killEnemy(enemy: Enemy, index: number) {
    this.enemies.splice(index, 1);
    this.enemiesDefeated++;
    if (this.art('vampire_fang')) this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 2 * this.art('vampire_fang'));
    if (!enemy.isBoss) sound.play('kill', enemy.elite ? 1.4 : 0.55 + Math.min(0.5, enemy.radius / 60));
    this.targetEnemiesThisWave = Math.max(0, this.targetEnemiesThisWave - 1);

    this.callbacks.onQuestUpdate((prev) =>
      prev.map((q) => (q.id === 'q1' ? { ...q, current: Math.min(q.target, this.enemiesDefeated) } : q))
    );

    for (let k = 0; k < 12; k++) {
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 140,
        vy: (Math.random() - 0.5) * 140,
        size: Math.random() * 4 + 2,
        color: enemy.glowColor,
        alpha: 1,
        life: 0.35,
        maxLife: 0.35,
        shape: 'spark',
      });
    }

    if (enemy.isBoss) {
      sound.play('boss_death', 1.6);
      this.currentBoss = null;
      this.callbacks.onBossState(null);
      this.screenShake = 22;
      this.spawnFloatingText('COLOSSUS DESTROYED!', enemy.x, enemy.y, '#f59e0b', true);

      this.bossKills++;
      this.lootItems.push({ id: `chest_${Math.random()}`, x: enemy.x, y: enemy.y, type: 'chest', value: 1, color: '#facc15', bobOffset: 0 });
      if (!this.inEndless && this.regionPhase === 'boss') {
        this.regionPhase = 'cleared';
        this.notice(`REGION CLEARED: ${this.region.name}`, '#facc15', 'region');
        setTimeout(() => { if (this.isRunning && this.regionPhase === 'cleared') this.openChest(`REGION ${this.regionIdx + 1} CLEARED`, this.regionIdx >= REGIONS.length - 1 ? 'Final region cleared! Endless survival follows.' : `Next: ${REGIONS[this.regionIdx + 1].name}`, true); }, 900);
      }
      if (false as boolean) {
        this.milestoneTriggered = true;
        setTimeout(() => {
          this.pause();
          const mins = Math.floor(this.gameTimeSeconds / 60);
          const secs = Math.floor(this.gameTimeSeconds % 60);
          const tStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          this.callbacks.onSurvivalMilestone?.(tStr, this.currentWave, this.enemiesDefeated);
        }, 1200);
      }

      for (let i = 0; i < 8; i++) {
        this.lootItems.push({
          id: `crystal_boss_${i}`,
          x: enemy.x + (Math.random() - 0.5) * 90,
          y: enemy.y + (Math.random() - 0.5) * 90,
          type: 'crystal',
          value: 1,
          color: '#38bdf8',
          bobOffset: Math.random() * 6,
        });
      }
    } else {
      if (ENEMY_DEFS[enemy.type]?.behavior === 'splitter' && !enemy.small) for (const o of [-1, 1]) { const c = this.spawnEnemyAt(enemy.type, enemy.x + o * 20, enemy.y, { small: true, elite: false, hpMul: 0.35 }); void c; }
      if (enemy.elite || (enemy.type === 'void_knight' && Math.random() < 0.07)) {
        this.lootItems.push({ id: `chest_${Math.random()}`, x: enemy.x, y: enemy.y, type: 'chest', value: 1, color: '#facc15', bobOffset: 0 });
      } else if (Math.random() < enemy.crystalDropChance) {
        this.lootItems.push({
          id: `crystal_${Math.random()}`,
          x: enemy.x,
          y: enemy.y,
          type: 'crystal',
          value: 1,
          color: '#38bdf8',
          bobOffset: Math.random() * 6,
        });
      } else if (Math.random() < 0.6) {
        this.lootItems.push({
          id: `gold_${Math.random()}`,
          x: enemy.x,
          y: enemy.y,
          type: 'gold',
          value: enemy.goldValue,
          color: '#eab308',
          bobOffset: Math.random() * 6,
        });
      } else {
        this.lootItems.push({
          id: `xp_${Math.random()}`,
          x: enemy.x,
          y: enemy.y,
          type: 'xp',
          value: enemy.xpValue,
          color: '#818cf8',
          bobOffset: Math.random() * 6,
        });
      }
    }
  }

  private collectLoot(item: LootItem) {
    if (item.type === 'xp') {
      sound.playPickup('xp');
      this.addXp(Math.round(item.value * (1 + 0.15 * this.art('scholar_lens'))));
    } else if (item.type === 'crystal') {
      sound.playPickup('crystal');
      this.stats.crystals += item.value;
      this.crystalsCollected += item.value;
      this.callbacks.onQuestUpdate((prev) =>
        prev.map((q) => (q.id === 'q2' ? { ...q, current: Math.min(q.target, this.crystalsCollected) } : q))
      );
      this.spawnFloatingText(`+${item.value} Crystal`, this.playerX, this.playerY - 30, '#38bdf8');
    } else if (item.type === 'chest') {
      this.openChest('TREASURE CHEST', 'Choose one artifact');
    } else if (item.type === 'gold') {
      sound.playPickup('gold');
      this.stats.gold += Math.round(item.value * (1 + 0.3 * this.art('golden_idol')));
    }
  }

  private addXp(amount: number) {
    this.stats.xp += amount;
    if (this.stats.xp >= this.stats.maxXp) {
      this.stats.xp -= this.stats.maxXp;
      this.stats.level++;
      this.stats.maxXp = Math.round(this.stats.maxXp * 1.25);
      sound.playLevelUp();
      this.pause();
      this.callbacks.onLevelUp(this.stats.level);
    }
  }

  private spawnFloatingText(text: string, x: number, y: number, color: string, bold: boolean = false) {
    this.damageNumbers.push({
      id: `text_${Math.random()}`,
      x,
      y,
      damage: 0,
      isCrit: bold,
      color,
      alpha: 1,
      life: 1.1,
      maxLife: 1.1,
      vy: -35,
    });
  }

  private findNearestEnemy(x: number, y: number, maxRange: number): Enemy | null {
    let nearest: Enemy | null = null;
    let minD = maxRange;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < minD) {
        minD = d;
        nearest = e;
      }
    }
    return nearest;
  }

  private findDensestCluster(radius: number): { x: number; y: number } | null {
    if (this.enemies.length === 0) return null;
    let bestX = this.enemies[0].x;
    let bestY = this.enemies[0].y;
    let maxCount = 0;

    for (let i = 0; i < Math.min(10, this.enemies.length); i++) {
      const e = this.enemies[i];
      let count = 0;
      for (const other of this.enemies) {
        if (Math.hypot(e.x - other.x, e.y - other.y) < radius) {
          count++;
        }
      }
      if (count > maxCount) {
        maxCount = count;
        bestX = e.x;
        bestY = e.y;
      }
    }
    return { x: bestX, y: bestY };
  }

  private handlePlayerDeath() {
    if (this.trySpiritSave()) return;
    this.resetFlight(); this.charging = null;
    const lives = this.art('phoenix') + this.art('second_heart');
    if (this.revives < lives) {
      this.revives++; this.revived = this.revives >= lives;
      this.stats.hp = Math.round(this.stats.maxHp * 0.6);
      FX.fire(this.playerX, this.playerY, 260);
      this.enemies.forEach((e) => { if (!e.isBoss && Math.hypot(e.x - this.playerX, e.y - this.playerY) < 300) e.hp = 0; });
      this.notice('PHOENIX FEATHER: revived at 60% HP!', '#fb923c', 'artifact');
      return;
    }
    this.pause();
    const extra = this.summaryExtra();
    this.callbacks.onGameOver(false, {
      survivalTime: `${Math.floor(this.gameTimeSeconds / 60).toString().padStart(2, '0')}:${Math.floor(this.gameTimeSeconds % 60).toString().padStart(2, '0')}`,
      enemiesDefeated: this.enemiesDefeated,
      crystalsCollected: this.crystalsCollected,
      goldEarned: this.stats.gold,
      waveReached: this.currentWave,
      levelReached: this.stats.level,
      damageDealt: this.totalDamageDealt,
      ...extra,
    });
  }

  // --- RENDER PASS ---
  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    let shakeX = 0;
    let shakeY = 0;
    if (this.enableScreenShake && this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
    }

    // Enhanced 3D Isometric Viewport & Camera Tilt (Expansive POV)
    const rs = this.renderScale, lw = w / rs, lh = h / rs;
    const zoom = Math.min(1.0, Math.max(0.78, lw / 1500)) * this.zoomK;
    this.lastZoom = zoom; this.viewHalfW = lw / 2 / zoom; this.viewHalfH = lh / (window.devicePixelRatio || 1) / 2 / (zoom * 0.88);
    ctx.translate(w / 2 + shakeX * rs, h / 2 + shakeY * rs);
    ctx.scale(zoom * rs, zoom * 0.88 * rs); // 3/4 Isometric Depth
    ctx.translate(-this.cameraX, -this.cameraY);

    const P = (k: string) => profMark(ctx, k); P('pre');

    P('1');
    // 1. Render Active Realm Arena Base
    this.renderBackdrop(ctx);
    this.ibg.renderFar(ctx, this.cameraX, this.cameraY, this.flyH, performance.now() / 1000);
    this.renderDeepGround(ctx);
    this.ibg.renderProps(ctx, performance.now() / 1000, (x, y, m) => this.onScreen(x, y, m));

    P('2');
    // 2. Obelisk Blue Laser Beams
    if (this.onScreen(OBELISK_POSITIONS[0][0] - this.origin.x, OBELISK_POSITIONS[0][1] - this.origin.y, 900)) VisualRenderer.renderObeliskBeams(ctx, OBELISK_POSITIONS[0][0] - this.origin.x, OBELISK_POSITIONS[0][1] - 70 - this.origin.y);

    P('3');
    // 3. Central 8-Directional Radiant Celestial Spear Wings (From Screenshot)
    VisualRenderer.renderCelestialSpearWings(ctx, this.playerX, this.playerY, this.playerAngle, 1.0);

    P('4');
    // 4. Ground Loot
    this.renderLoot(ctx);

    P('5');
    // 5. Living Demonic Enemies
    this.renderLivingEnemies(ctx);

    P('6');
    // 6. Player Archmage
    for (const b of this.enemyShots) if (this.onScreen(b.x, b.y, 40)) renderShot(ctx, b);
    VisualRenderer.renderArchmage(ctx, this.playerX, this.playerY, this.playerAngle, this.stats.isDashing, this.faceAngle, this.moveAmt, this.currentHero.id, this.flyH);
    if (this.spirits.length >= SPIRIT.BEACON_AT) { const R = SPIRIT.BEACON_R * (1 + 0.25 * ascension(this.spirits.length)); ctx.save(); ctx.globalAlpha = 0.16 + 0.05 * Math.sin(this.gameTimeSeconds * 3); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.ellipse(this.playerX, this.playerY, R, R * 0.8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    { const asc = ascension(this.spirits.length); for (let i = 0; i < this.spirits.length; i++) { const sp = this.spirits[i]; renderSpirit(ctx, sp.x, sp.y, sp.z, this.gameTimeSeconds * 3 + i, sp.dash > 0);
      const rc = ROLE_COLOR[sp.role ?? 'guardian']; ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = asc === 2 ? '#fde68a' : rc; ctx.lineWidth = asc ? 3 : 2; ctx.beginPath(); ctx.arc(sp.x, sp.y - sp.z, 15 + asc * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = rc; ctx.beginPath(); ctx.arc(sp.x, sp.y - sp.z - 20, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of this.beams) { const k = b.life / 0.22; ctx.strokeStyle = b.color; ctx.globalAlpha = k; ctx.lineWidth = 2 + 8 * k; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    ctx.restore();
    if (this.charging) { const k = Math.min(1, (this.gameTimeSeconds - this.charging.t0) / this.chargeMax()); const cz = this.casterZ(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = k >= 1 ? '#fde68a' : 'rgba(255,240,180,0.8)'; ctx.lineWidth = 3 + 3 * k; ctx.beginPath(); ctx.arc(this.playerX, this.playerY - cz - 30, 30 + 26 * (1 - k), 0, Math.PI * 2 * k); ctx.stroke(); ctx.restore(); }
    for (const l of this.labels) { const k = l.life / l.max; ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.font = `900 ${l.big ? 26 : 16}px Cinzel, Georgia, serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; const yy = l.y - (1 - k) * 40; ctx.strokeText(l.text, l.x, yy); ctx.fillStyle = l.color; ctx.fillText(l.text, l.x, yy); ctx.restore(); }

    P('7');
    // 7. Projectiles (Arcane Missiles & Fused Magic)
    this.renderProjectiles(ctx);
    this.magic2.render(ctx, this.gameTimeSeconds);

    P('8');
    // 8. Dynamic Weather Overlay System (Falling Snow, Embers, Rain, Stardust)
    this.weatherSystem.render(ctx);

    P('9');
    // 9. Dynamic Particles & Shockwaves
    this.renderParticles(ctx);

    P('9b');
    // 9b. Spell impact / burst effects (visual only)
    FX.render(ctx);

    P('10');
    // 10. Floating Glowing Damage Numbers
    this.renderDamageNumbers(ctx);

    P('end');
    ctx.restore();
  }

  private renderDeepGround(ctx: CanvasRenderingContext2D) {
    const now = performance.now() / 1000;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const z of this.zones) {
      const a = Math.max(0, 1 - z.t / z.max);
      if (!this.onScreen(z.x, z.y, z.r)) continue;
      drawGlow(ctx, `rgb(${z.color})`, z.x, z.y, z.r * 1.15 * (0.92 + 0.08 * Math.sin(now * 9 + z.x)), 0.42 * a); // cached glow sprite instead of a per-frame gradient
      if (z.steam) for (let k = 0; k < (this.lod >= 2 ? 3 : 7); k++) { const pa = k * 0.9 + now * 0.6, pr = z.r * (0.25 + 0.5 * ((k * 37) % 10) / 10); const px = z.x + Math.cos(pa) * pr, py = z.y + Math.sin(pa) * pr * 0.7 - ((now * 30 + k * 13) % 30); ctx.fillStyle = `rgba(241,245,249,${0.28 * a})`; ctx.beginPath(); ctx.arc(px, py, 18 + (k % 3) * 8, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    for (const h of this.hazards) {
      const k = 1 - h.t / 1.3;
      ctx.save();
      ctx.strokeStyle = `rgba(${h.color},${0.5 + 0.5 * k})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${h.color},${0.12 + 0.25 * k})`; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * k, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  private magic2Shift(dx: number, dy: number) { this.magic2?.shift(dx, dy); }
  public magic2: Magic2 = new Magic2({
    enemies: [] as Enemy[],
    px: () => this.playerX, py: () => this.playerY, facing: () => this.faceAngle, time: () => this.gameTimeSeconds,
    hit: (e, d, c, el) => this.damageEnemy(e, d * (this.stats.spellPower / 100), c, el),
    densest: (r) => this.findDensestCluster(r), nearest: (x, y, m) => this.findNearestEnemy(x, y, m),
    beam: (x1, y1, x2, y2, color) => this.beams.push({ x1, y1, x2, y2, color, life: 0.22 }),
    zone: (x, y, r, dur, dps, rgb) => this.addZone(x, y, r, dur, dps, rgb),
    heal: (n) => { this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + n); },
    shake: (n) => this.shake(n), sfx: (n, sz) => sound.play(n, sz), onScreen: (x, y, m) => this.onScreen(x, y, m),
  });
  private renderGround(ctx: CanvasRenderingContext2D, now: number) {
    const hw = this.viewHalfW, hh = this.viewHalfH;
    this.world.setTheme(arenaTheme(this.currentArena));
    profMark(ctx, '1ground');
    this.world.render(ctx, this.cameraX, this.cameraY, hw, hh, this.origin.x, this.origin.y, now);
    // the rune circle is only a decorative spawn decal at absolute (0,0)
    const dx = -this.origin.x, dy = -this.origin.y;
    if (Math.abs(dx - this.cameraX) < hw + 700 && Math.abs(dy - this.cameraY) < hh + 700) { profMark(ctx, '1runes'); ArenaRenderer.renderSpawnDecal(ctx, this.currentArena, this.arenaRadius, dx, dy); }
  }
  private renderBackdrop(ctx: CanvasRenderingContext2D) {
    const now = performance.now() / 1000, c = this.cata;
    const hw = this.viewHalfW, hh = this.viewHalfH, ax = this.cataAt.x, ay = this.cataAt.y;
    if (c.phase === 'scene' || c.phase === 'reform' || c.phase === 'collapse') {
      const kind = c.kind!;
      renderScene(ctx, kind, ax, ay, this.cameraX, this.cameraY, hw, hh, now, c.phase === 'collapse' ? Math.min(1, c.t / 0.8) : 1);
      if (c.phase === 'collapse') {
        // the ground around the player shatters into wedges falling away over the new scene
        const k = c.t / 1.6, RR = Math.hypot(hw, hh) + 200;
        if (k < 1) for (let i = 0; i < 12; i++) {
          const a0 = (i / 12) * Math.PI * 2, a1 = a0 + Math.PI * 2 / 12, am = (a0 + a1) / 2;
          ctx.save(); ctx.globalAlpha = 1 - k;
          ctx.translate(ax, ay); ctx.translate(Math.cos(am) * k * 500, Math.sin(am) * k * 500 + k * k * 600); ctx.rotate((i % 2 ? 1 : -1) * k * 0.6); ctx.scale(1 - 0.4 * k, 1 - 0.4 * k); ctx.translate(-ax, -ay);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.arc(ax, ay, RR, a0, a1); ctx.closePath(); ctx.clip();
          this.renderGround(ctx, now);
          ctx.restore();
        }
      } else if (c.phase === 'reform') {
        ctx.save(); ctx.globalAlpha = Math.min(1, c.t / 1.5); this.renderGround(ctx, now); ctx.restore();
      }
      return;
    }
    this.renderGround(ctx, now);
    if (c.phase === 'crack') renderCracks(ctx, c.cracks, Math.min(1, c.t / 2), '#fb7185');
  }

  private renderLivingEnemies(ctx: CanvasRenderingContext2D) {
    const now = performance.now();

    for (const e of this.enemies) {
      if (!e.isBoss && !this.onScreen(e.x, e.y, 140)) continue;
      const isHit = Boolean(e.hitFlash && now < e.hitFlash);
      const isFrozen = Boolean(e.frozenUntil && now < e.frozenUntil);

      if (!e.isBoss && !this.onScreen(e.x, e.y, e.radius + 60)) continue;
      const aura = ELITE_AURA[this.regionIdx % ELITE_AURA.length];
      if (e.isBoss) {
        VisualRenderer.renderVoidColossus(ctx, e.x, e.y, e.hp, e.maxHp, isHit);
      } else if (hasNewArt(e.type)) {
        renderNewEnemy(ctx, e, isFrozen, isHit, this.playerX < e.x ? -1 : 1, (e.x * 0.013 + e.y * 0.007) % 6.28 + this.gameTimeSeconds, e.elite ? aura : undefined);
      } else {
        const facing = this.playerX < e.x ? -1 : 1;
        if (e.elite) renderEliteAura(ctx, e.x, e.y, e.radius, aura);
        VisualRenderer.renderDemonMinion(ctx, e.x, e.y, e.type, isFrozen, isHit, facing, e.hp, e.maxHp, (e.x * 0.013 + e.y * 0.007) % 6.28);
      }
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) VisualRenderer.renderProjectile(ctx, p);
  }

  private renderLoot(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.003;

    for (const item of this.lootItems) {
      if (!this.onScreen(item.x, item.y, 40)) continue;
      ctx.save();
      const bob = Math.sin(time * 2 + item.bobOffset) * 4;
      ctx.translate(item.x, item.y + bob);
      if (item.merged && item.merged > 1) { const k = Math.min(2.2, 1 + Math.log2(item.merged) * 0.25); ctx.scale(k, k); }


      if (item.type === 'crystal') {
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 9);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === 'chest') {
        // wooden treasure chest resting on the ground (no bob)
        ctx.translate(0, -bob);
        drawGlow(ctx, 'rgba(250,204,21,1)', 0, 0, 60, 0.35);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(0, 14, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7a4a22'; ctx.fillRect(-26, -8, 52, 22);
        ctx.fillStyle = '#8b5a2b'; ctx.beginPath(); ctx.moveTo(-26, -8); ctx.quadraticCurveTo(0, -30, 26, -8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 1.5; for (const yy of [-1, 6]) { ctx.beginPath(); ctx.moveTo(-26, yy); ctx.lineTo(26, yy); ctx.stroke(); }
        ctx.fillStyle = '#d4a017'; ctx.fillRect(-26, -9, 52, 3); for (const xx of [-20, 16]) ctx.fillRect(xx, -22, 4, 36);
        ctx.fillRect(-4, -6, 8, 9); ctx.fillStyle = '#1c1917'; ctx.fillRect(-1, -3, 2, 4);
        ctx.strokeStyle = '#2b1606'; ctx.lineWidth = 2; ctx.strokeRect(-26, -8, 52, 22);
        const sp = (time * 2 + item.bobOffset) % 6.28; ctx.fillStyle = '#fef9c3'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(sp * 3); ctx.beginPath(); ctx.arc(Math.cos(sp) * 22, -24 + Math.sin(sp) * 6, 2.5, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
      } else if (item.type === 'gold') {
        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#818cf8';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lod = this.lod;
    for (let i = 0; i < this.particles.length; i++) { const part = this.particles[i];
      if (!this.onScreen(part.x, part.y, 60)) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, part.alpha));
      ctx.fillStyle = part.color;
      if (part.shape === 'spark') {
        if (lod < 2) drawGlow(ctx, part.color, part.x, part.y, part.size * 2.2, 0.6);
        ctx.fillRect(part.x - part.size / 3, part.y - part.size / 3, part.size / 1.5, part.size / 1.5);
      } else if (part.shape === 'shard') {
        ctx.beginPath();
        ctx.moveTo(part.x, part.y - part.size);
        ctx.lineTo(part.x + part.size * 0.5, part.y + part.size);
        ctx.lineTo(part.x - part.size * 0.5, part.y + part.size);
        ctx.closePath();
        ctx.fill();
      } else if (lod < 2 || (i & 1) === 0) {
        drawGlow(ctx, part.color, part.x, part.y, part.size * 1.8, 0.8);
      }
    }
    ctx.restore();
  }

  private renderDamageNumbers(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const dn of this.damageNumbers) {
      if (!this.onScreen(dn.x, dn.y, 60)) continue;
      ctx.globalAlpha = dn.alpha;
      ctx.textAlign = 'center';

      if (dn.damage === 0) {
        ctx.font = 'bold 15px Cinzel, Georgia, serif';
        ctx.fillStyle = dn.color;
        ctx.fillText(dn.id.startsWith('text_') ? '' : '', dn.x, dn.y);
      } else if (dn.isCrit) {
        ctx.font = '900 24px Cinzel, Georgia, serif';
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3.5;
        ctx.strokeText(dn.damage.toString(), dn.x, dn.y);
        ctx.fillText(dn.damage.toString(), dn.x, dn.y);
      } else {
        ctx.font = '700 19px Cinzel, Georgia, serif';
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2.5;
        ctx.strokeText(dn.damage.toString(), dn.x, dn.y);
        ctx.fillText(dn.damage.toString(), dn.x, dn.y);
      }
    }
    ctx.restore();
  }
}
