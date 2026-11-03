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
import { BOSS_TEST_TIME_SECONDS, BOSS_TEST_KILLS, BOSS_TEST_ENEMIES_LEFT } from './constants';
import { sound } from '../audio/soundEngine';
import { VisualRenderer } from './Visuals';
import { FX } from './FX';
import { drawGlow } from './ArtKit';
import { WeatherSystem } from './WeatherSystem';
import { ARENAS_LIST, ArenaRenderer, OBELISK_POSITIONS } from './arenas';
import { HEROES_LIST } from './characters';
import { BASE_SPELLS, BASE_SPELL_IDS, PASSIVES, UpgradeChoice, applySpellLevel, makeComboSpell, makeSpell, spellEffectText } from './spells';
import { COMBO_MAGIC_RECIPES, canFormCombo } from './combos';
import { ARTIFACTS, ELEMENT_OF, ENDLESS_BOSS_EVERY, EVOLUTIONS, REGIONS, SYNERGIES, SYNERGY_MIN_LEVEL, artifactById, endlessScale, evoUnlockLevel, loadBest, saveBest, Element } from './deep';

export type GameMode = 'regions' | 'endless';
interface Zone { x: number; y: number; r: number; t: number; max: number; dps: number; color: string; tick: number }
interface Hazard { x: number; y: number; r: number; t: number; dmg: number; color: string; slow?: boolean }

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

    this.seedInitialBattlefield();
  }

  private onResize = () => {
    this.resizeCanvas();
  };

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.code === 'Space') {
      this.triggerDash();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseAim = {
      x: e.clientX - this.canvas.width / 2,
      y: e.clientY - this.canvas.height / 2,
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
  public MAX_PARTICLES = 450;

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
    dmg *= 1 + 0.12 * this.art('crown');
    area *= 1 + 0.15 * this.art('sigil');
    count += this.art('prism');
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
    const pool = ARTIFACTS.filter((a) => this.art(a.id) < a.max);
    const sh = pool.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    return sh.slice(0, n).map((a) => { const l = this.art(a.id) + 1; return { id: `art:${a.id}`, kind: 'artifact', title: `${a.name} Lv ${l}`, desc: a.desc(l), icon: a.icon, color: a.color, level: l }; });
  }
  public grantArtifact(id: string) {
    const a = artifactById(id);
    if (!a || this.art(id) >= a.max) return;
    this.artifacts[id] = this.art(id) + 1;
    const st = this.stats;
    if (id === 'eye') st.critChance += 8;
    else if (id === 'lodestone') st.pickupRadius += 60;
    else if (id === 'titan') { st.maxHp += 150; st.hp += 150; }
    this.notice(`ARTIFACT: ${a.name} — ${a.desc(this.artifacts[id])}`, a.color, 'artifact');
    this.spawnFloatingText(a.name, this.playerX, this.playerY - 70, a.color, true);
    this.callbacks.onStatsUpdate({ ...this.stats });
  }
  /** Pause and offer a chest (evolutions first, then artifacts). */
  public openChest(title: string, sub = 'Choose a reward') {
    const choices = [...this.evolveChoices(), ...this.artifactChoices(4)].slice(0, 4);
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
        this.synergies.push(sy.id);
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
    this.enemies = this.enemies.filter((e) => !e.isBoss); this.currentBoss = null; this.callbacks.onBossState(null);
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
    this.enemies = this.enemies.filter((e) => e.isBoss);
    this.applyRegionArena();
    this.notice(`REGION ${this.regionIdx + 1}: ${this.region.name}`, this.region.color, 'region');
  }
  /** Called by App after the region-clear chest choice. */
  public afterChest() {
    if (this.regionPhase === 'cleared') this.advanceRegion();
  }
  private updateDeep(dt: number) {
    // regions / endless progression
    if (!this.inEndless) {
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
    const hz = this.region.hazard; const hzMul = this.inEndless ? 0.35 + 0.15 * (this.endlessTime / 60) : 1;
    this.hazardTimer -= dt;
    if (this.hazardTimer <= 0) {
      this.hazardTimer = hz.every * (this.inEndless ? Math.max(0.5, 1.2 - this.endlessTime / 900) : 1);
      const n = this.inEndless ? 1 + Math.min(3, Math.floor(this.endlessTime / 180)) : 1 + Math.floor(this.regionIdx / 2);
      for (let k = 0; k < n; k++) this.hazards.push({ x: this.playerX + (k ? (Math.random() - 0.5) * 360 : 0), y: this.playerY + (k ? (Math.random() - 0.5) * 300 : 0), r: hz.radius, t: 1.3, dmg: Math.round(hz.dmg * hzMul), color: hz.color, slow: hz.slow });
    }
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.t -= dt;
      if (h.t <= 0) {
        FX.ring(h.x, h.y, h.r, `rgba(${h.color},1)`, 0.5);
        if (Math.hypot(this.playerX - h.x, this.playerY - h.y) < h.r && !this.stats.isDashing) {
          this.stats.hp -= h.dmg;
          if (h.slow) this.slowUntil = this.gameTimeSeconds + 2.5;
          this.spawnFloatingText(`-${h.dmg} ${this.region.hazard.name}`, this.playerX, this.playerY - 40, `rgb(${h.color})`);
        }
        this.hazards.splice(i, 1);
      }
    }
    // burning zones
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; z.t += dt; z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = 0.5;
        for (const e of this.enemies) if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.radius) this.damageEnemy(e, Math.round(z.dps * 0.5), '#fb923c', 'fire', false);
      }
      if (z.t >= z.max) this.zones.splice(i, 1);
    }
    // perf caps
    if (this.particles.length > this.MAX_PARTICLES) this.particles.splice(0, this.particles.length - this.MAX_PARTICLES);
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
    return { hp: r.hp * ramp, dmg: r.dmg * (0.85 + 0.3 * Math.min(1, this.regionTime / r.duration)), speed: 1, spawn: r.spawn / ramp, cap: 95 };
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
    if (owned.length < 4) {
      for (const id of BASE_SPELL_IDS) {
        if (owned.some((s) => s.id === id)) continue;
        const b = BASE_SPELLS[id];
        pool.push({ id: `new:${id}`, kind: 'new', title: `${b.name} Lv 1`, desc: spellEffectText(makeSpell(id, 1)), icon: b.icon, color: b.color, level: 1 });
      }
    }
    for (const sp of owned) {
      if (sp.level >= sp.maxLevel) continue;
      const nxt = applySpellLevel({ ...sp, level: sp.level + 1 });
      pool.push({ id: `lvl:${sp.id}`, kind: 'level', title: `${sp.name} Lv ${sp.level + 1}`, desc: `${spellEffectText(nxt)} (was ${sp.count}), +25% damage`, icon: sp.icon, color: sp.color, level: sp.level + 1 });
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

  private autoCast(spell: Spell) {
    if (spell.isCombo) {
      this.castCombo(spell);
    } else this.autoCastRaw(this.eff(spell));
    this.castLog.push({ id: spell.id, t: this.gameTimeSeconds });
    if (this.castLog.length > 60) this.castLog.shift();
    spell.currentCooldown = spell.cooldown * Math.pow(0.9, this.fastCasting) * (1 - this.stats.cooldownReduction / 100) * (1 - 0.07 * this.art('hourglass'));
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
    }
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

  private spawnEnemyAt(type: Enemy['type'], x: number, y: number) {
    let radius = 16;
    let hp = 450;
    let speed = 2.4;
    let damage = 45;
    let xp = 35;
    let gold = 20;
    let color = '#a855f7';
    let glow = '#7e22ce';
    let name = 'Void Crawler';

    if (type === 'crawler') {
      radius = 14;
      hp = 320;
      speed = 3.0;
      damage = 30;
      xp = 25;
      gold = 15;
      color = '#c084fc';
      glow = '#a855f7';
      name = 'Void Crawler';
    } else if (type === 'shadow_fiend') {
      radius = 18;
      hp = 640;
      speed = 2.0;
      damage = 65;
      xp = 45;
      gold = 35;
      color = '#ef4444';
      glow = '#b91c1c';
      name = 'Shadow Fiend';
    } else if (type === 'hellhound') {
      radius = 20;
      hp = 880;
      speed = 2.6;
      damage = 80;
      xp = 60;
      gold = 50;
      color = '#f97316';
      glow = '#ea580c';
      name = 'Hellhound';
    } else if (type === 'void_knight') {
      radius = 26;
      hp = 1900;
      speed = 1.5;
      damage = 120;
      xp = 160;
      gold = 130;
      color = '#6366f1';
      glow = '#4f46e5';
      name = 'Void Knight';
    }

    // Early-wave scaling so a level-1 mage can fight wave 1 (waves 7+ unchanged).
    const df = this.diff();
    hp = Math.round(hp * df.hp);
    damage = Math.round(damage * df.dmg * 0.7);
    speed *= df.speed;
    this.enemies.push({
      id: `enemy_${Math.random()}`,
      name,
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      hp,
      maxHp: hp,
      speed,
      damage,
      xpValue: xp,
      crystalDropChance: 0.18,
      goldValue: gold,
      color,
      glowColor: glow,
      isBoss: false,
    });
  }

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
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;
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
    this.gameTimeSeconds += dt;

    const mins = Math.floor(this.gameTimeSeconds / 60);
    const secs = Math.floor(this.gameTimeSeconds % 60);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.callbacks.onWaveUpdate(this.currentWave, this.targetEnemiesThisWave, timeStr);

    // Survival Milestone check: 15:00 mark (900 seconds) required by the containment protocol
    if (false as boolean) {
      this.milestoneTriggered = true;
      this.pause();
      this.callbacks.onSurvivalMilestone?.(timeStr, this.currentWave, this.enemiesDefeated);
    }

    this.callbacks.onQuestUpdate((prev) =>
      prev.map((q) => (q.id === 'q3' ? { ...q, current: Math.min(q.target, Math.floor(this.gameTimeSeconds)) } : q))
    );

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    if (this.stats.dashCurrentCooldown > 0) {
      this.stats.dashCurrentCooldown = Math.max(0, this.stats.dashCurrentCooldown - dt);
    }

    this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 15 * dt);
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 8 * dt);

    // Spells Update
    // Passive magic: every owned spell auto-fires when ready, staggered by a global cast gap.
    this.castGapTimer = Math.max(0, this.castGapTimer - dt);
    let ready: Spell | null = null;
    for (const spell of this.spells) {
      if (spell.currentCooldown > 0) spell.currentCooldown = Math.max(0, spell.currentCooldown - dt);
      else if (!ready) ready = spell;
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
    if (moveLen > 0) {
      const speed = this.stats.speed * 60 * (this.gameTimeSeconds < this.slowUntil ? 0.6 : 1);
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

    // Clamp within stone sanctuary boundary
    const playerDist = Math.hypot(this.playerX, this.playerY);
    if (playerDist > this.arenaRadius - 40) {
      const ang = Math.atan2(this.playerY, this.playerX);
      this.playerX = Math.cos(ang) * (this.arenaRadius - 40);
      this.playerY = Math.sin(ang) * (this.arenaRadius - 40);
    }

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
    if (this.stats.hp <= 0) { this.handlePlayerDeath(); if (this.stats.hp <= 0) return; }

    // Spawn regular hordes (region roster / endless scaling)
    this.spawnTimer += dt;
    const df = this.diff();
    if (this.spawnTimer >= df.spawn && this.enemies.length < df.cap) {
      this.spawnTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.min(this.arenaRadius - 50, 520 + Math.random() * 200);
      let roll = Math.random();
      const roster = this.region.roster;
      let type = roster[0][0];
      for (const [t, w] of roster) { if (roll < w) { type = t; break; } roll -= w; }
      const sx = this.playerX + Math.cos(angle) * dist, sy = this.playerY + Math.sin(angle) * dist;
      const sd = Math.hypot(sx, sy); const k = sd > this.arenaRadius - 40 ? (this.arenaRadius - 40) / sd : 1;
      this.spawnEnemyAt(type, sx * k, sy * k);
    }

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
          // Flocking repulsion
          let repelX = 0;
          let repelY = 0;
          for (let j = 0; j < Math.min(this.enemies.length, 12); j++) {
            const other = this.enemies[j];
            if (other !== e) {
              const odx = e.x - other.x;
              const ody = e.y - other.y;
              const odist = Math.hypot(odx, ody);
              if (odist > 0 && odist < 32) {
                repelX += odx / odist;
                repelY += ody / odist;
              }
            }
          }

          e.x += ((dx / dist) * 0.7 + repelX * 0.3) * e.speed * 60 * dt;
          e.y += ((dy / dist) * 0.7 + repelY * 0.3) * e.speed * 60 * dt;
        }

        // Damage Player
        if (dist < e.radius + 18 && !this.stats.isDashing) {
          const dmg = (e.damage * dt) / 0.35;
          if (this.stats.mana > dmg * 0.7) {
            this.stats.mana -= dmg * 0.7;
            this.stats.hp -= dmg * 0.3;
          } else {
            this.stats.hp -= dmg;
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

      if (p.type === 'arcane_missile' && (!p.homingTarget || p.homingTarget.hp <= 0)) {
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

      if (dist < pickupRad || item.magnetized) {
        item.magnetized = true;
        const spd = 480;
        item.x += (dx / dist) * spd * dt;
        item.y += (dy / dist) * spd * dt;
      }

      if (dist < 32) {
        this.collectLoot(item);
        this.lootItems.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.alpha = Math.max(0, part.life / part.maxLife);
      if (part.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Damage Numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      dn.y += dn.vy * dt;
      dn.alpha = Math.max(0, dn.life / dn.maxLife);
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }

    // Update Radar Data
    this.callbacks.onRadarUpdate({
      playerX: this.playerX,
      playerY: this.playerY,
      arenaRadius: this.arenaRadius,
      enemies: this.enemies.map((e) => ({ x: e.x, y: e.y, isBoss: e.isBoss })),
      crystals: this.lootItems.filter((l) => l.type === 'crystal').map((l) => ({ x: l.x, y: l.y })),
    });

    this.callbacks.onStatsUpdate({ ...this.stats });
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
      this.stats.hp -= 240;
      sound.playHit();
      this.spawnFloatingText('-240 Boss Shockwave!', this.playerX, this.playerY - 40, '#ef4444');
    }
  }

  private castArcaneMissiles(spell: Spell) {
    sound.playArcaneCast();
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
    sound.playFrostNova();
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
        x: this.playerX, y: this.playerY,
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
    sound.playLightning();
    this.screenShake = 9;
    const damage = Math.round(spell.damage * (this.stats.spellPower / 100));

    for (let c = 0; c < spell.count; c++) {
      const target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      const tx = target ? target.x : this.playerX + (Math.random() - 0.5) * 400;
      const ty = target ? target.y : this.playerY + (Math.random() - 0.5) * 400;
      FX.bolt(tx, ty);
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
    sound.playMeteorExplosion();
    this.screenShake = 18;
    const damage = Math.round(spell.damage * (this.stats.spellPower / 100));

    for (let burst = 0; burst < Math.max(1, spell.count); burst++) {
    const target = burst === 0 ? this.findDensestCluster(400) : this.enemies[Math.floor(Math.random() * this.enemies.length)];
    const tx = target ? target.x : this.playerX + (Math.random() - 0.5) * 320;
    const ty = target ? target.y : this.playerY + (Math.random() - 0.5) * 320;
    FX.fire(tx, ty, spell.area);

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
    if (el === 'fire' && frozen && this.hasSyn('thermal')) { mult *= 1.6; enemy.frozenUntil = 0; }
    if (el === 'lightning' && frozen && this.hasSyn('chainfreeze')) mult *= 2;
    if ((enemy.isBoss || enemy.type === 'void_knight') && this.art('slayer')) mult *= 1 + 0.35 * this.art('slayer');
    const finalDamage = Math.round((isCrit ? baseDamage * this.stats.critMultiplier : baseDamage) * mult);
    if (!fx) { enemy.hp -= finalDamage; this.totalDamageDealt += finalDamage; return; }

    enemy.hp -= finalDamage;
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
      sound.playLevelUp();
      this.currentBoss = null;
      this.callbacks.onBossState(null);
      this.screenShake = 22;
      this.spawnFloatingText('COLOSSUS DESTROYED!', enemy.x, enemy.y, '#f59e0b', true);

      this.bossKills++;
      this.lootItems.push({ id: `chest_${Math.random()}`, x: enemy.x, y: enemy.y, type: 'chest', value: 1, color: '#facc15', bobOffset: 0 });
      if (!this.inEndless && this.regionPhase === 'boss') {
        this.regionPhase = 'cleared';
        this.notice(`REGION CLEARED: ${this.region.name}`, '#facc15', 'region');
        setTimeout(() => { if (this.isRunning && this.regionPhase === 'cleared') this.openChest(`REGION ${this.regionIdx + 1} CLEARED`, this.regionIdx >= REGIONS.length - 1 ? 'Final region cleared! Endless survival follows.' : `Next: ${REGIONS[this.regionIdx + 1].name}`); }, 900);
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
      if (enemy.type === 'void_knight' && Math.random() < 0.07) {
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
      this.addXp(item.value);
    } else if (item.type === 'crystal') {
      sound.playPickup('crystal');
      this.stats.crystals += item.value;
      this.crystalsCollected += item.value;
      this.callbacks.onQuestUpdate((prev) =>
        prev.map((q) => (q.id === 'q2' ? { ...q, current: Math.min(q.target, this.crystalsCollected) } : q))
      );
      this.spawnFloatingText(`+${item.value} Crystal`, this.playerX, this.playerY - 30, '#38bdf8');
    } else if (item.type === 'chest') {
      sound.playLevelUp();
      this.openChest('ARTIFACT CHEST', 'Relics and evolutions');
    } else if (item.type === 'gold') {
      sound.playPickup('gold');
      this.stats.gold += item.value;
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
    if (this.art('phoenix') > 0 && !this.revived) {
      this.revived = true;
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
    const zoom = Math.min(1.0, Math.max(0.78, w / 1500));
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(zoom, zoom * 0.88); // 3/4 Isometric Depth
    ctx.translate(-this.cameraX, -this.cameraY);

    // 1. Render Active Realm Arena Base
    this.renderBackdrop(ctx);
    this.renderDeepGround(ctx);

    // 2. Obelisk Blue Laser Beams
    VisualRenderer.renderObeliskBeams(ctx, OBELISK_POSITIONS[0][0], OBELISK_POSITIONS[0][1] - 70);

    // 3. Central 8-Directional Radiant Celestial Spear Wings (From Screenshot)
    VisualRenderer.renderCelestialSpearWings(ctx, this.playerX, this.playerY, this.playerAngle, 1.0);

    // 4. Ground Loot
    this.renderLoot(ctx);

    // 5. Living Demonic Enemies
    this.renderLivingEnemies(ctx);

    // 6. Player Archmage
    VisualRenderer.renderArchmage(ctx, this.playerX, this.playerY, this.playerAngle, this.stats.isDashing, this.faceAngle, this.moveAmt, this.currentHero.id);

    // 7. Projectiles (Arcane Missiles & Fused Magic)
    this.renderProjectiles(ctx);

    // 8. Dynamic Weather Overlay System (Falling Snow, Embers, Rain, Stardust)
    this.weatherSystem.render(ctx);

    // 9. Dynamic Particles & Shockwaves
    this.renderParticles(ctx);

    // 9b. Spell impact / burst effects (visual only)
    FX.render(ctx);

    // 10. Floating Glowing Damage Numbers
    this.renderDamageNumbers(ctx);

    ctx.restore();
  }

  private renderDeepGround(ctx: CanvasRenderingContext2D) {
    const now = performance.now() / 1000;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const z of this.zones) {
      const a = Math.max(0, 1 - z.t / z.max);
      const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      g.addColorStop(0, `rgba(${z.color},${0.22 * a})`); g.addColorStop(0.7, `rgba(${z.color},${0.1 * a})`); g.addColorStop(1, `rgba(${z.color},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.92 + 0.08 * Math.sin(now * 9 + z.x)), 0, Math.PI * 2); ctx.fill();
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

  private renderBackdrop(ctx: CanvasRenderingContext2D) {
    // Code-drawn arena (cached static layers + cheap animated overlays)
    ArenaRenderer.renderArenaBase(ctx, this.currentArena, this.arenaRadius, this.cameraX, this.cameraY);
  }

  private renderLivingEnemies(ctx: CanvasRenderingContext2D) {
    const now = performance.now();

    for (const e of this.enemies) {
      const isHit = Boolean(e.hitFlash && now < e.hitFlash);
      const isFrozen = Boolean(e.frozenUntil && now < e.frozenUntil);

      if (e.isBoss) {
        VisualRenderer.renderVoidColossus(ctx, e.x, e.y, e.hp, e.maxHp, isHit);
      } else {
        const facing = this.playerX < e.x ? -1 : 1;
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
      ctx.save();
      const bob = Math.sin(time * 2 + item.bobOffset) * 4;
      ctx.translate(item.x, item.y + bob);


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
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
        g.addColorStop(0, 'rgba(250,204,21,0.55)'); g.addColorStop(1, 'rgba(250,204,21,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7c2d12'; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
        ctx.fillRect(-12, -8, 24, 16); ctx.strokeRect(-12, -8, 24, 16);
        ctx.fillStyle = '#facc15'; ctx.fillRect(-12, -10, 24, 5); ctx.fillRect(-2.5, -4, 5, 7);
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
    for (const part of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, part.alpha));
      ctx.fillStyle = part.color;
      if (part.shape === 'spark') {
        drawGlow(ctx, part.color, part.x, part.y, part.size * 2.2, 0.6);
        ctx.fillRect(part.x - part.size / 3, part.y - part.size / 3, part.size / 1.5, part.size / 1.5);
      } else if (part.shape === 'shard') {
        ctx.beginPath();
        ctx.moveTo(part.x, part.y - part.size);
        ctx.lineTo(part.x + part.size * 0.5, part.y + part.size);
        ctx.lineTo(part.x - part.size * 0.5, part.y + part.size);
        ctx.closePath();
        ctx.fill();
      } else {
        drawGlow(ctx, part.color, part.x, part.y, part.size * 1.8, 0.8);
      }
    }
    ctx.restore();
  }

  private renderDamageNumbers(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const dn of this.damageNumbers) {
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
