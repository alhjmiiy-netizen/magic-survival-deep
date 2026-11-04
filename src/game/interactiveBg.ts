/**
 * v6 interactive background. Three cheap layers, all pooled and capped:
 *  - far parallax motes (screen space) that drift against movement and spread/shrink with altitude,
 *  - touchable / spell-breakable scenery props (world space) with capped rewards,
 *  - reaction waves (on casts) and tap ripples (quick taps only, never consumes input).
 * One set per region (r1..r5) plus the Cataclysm scenes (sky / abyss / rift).
 */
import { Q } from './ArtKit';

export type PropKind = 'crystal' | 'lantern' | 'pod' | 'stone' | 'cloud' | 'brazier' | 'shard';
export interface BgSet { id: string; name: string; mote: string; props: { kind: PropKind; color: string; name: string }[] }
export const IBG_SETS: Record<string, BgSet> = {
  r1: { id: 'r1', name: 'Astral Sanctuary', mote: '186,230,253', props: [{ kind: 'crystal', color: '#38bdf8', name: 'Star crystal' }, { kind: 'lantern', color: '#bae6fd', name: 'Astral lantern' }] },
  r2: { id: 'r2', name: 'Glacial Citadel', mote: '224,242,254', props: [{ kind: 'shard', color: '#7dd3fc', name: 'Ice spire' }, { kind: 'stone', color: '#e0f2fe', name: 'Frost rune' }] },
  r3: { id: 'r3', name: 'Infernal Abyss', mote: '253,186,116', props: [{ kind: 'brazier', color: '#f97316', name: 'Ember brazier' }, { kind: 'pod', color: '#fb7185', name: 'Magma pod' }] },
  r4: { id: 'r4', name: 'Void Crypt', mote: '233,213,255', props: [{ kind: 'stone', color: '#c084fc', name: 'Crypt sigil' }, { kind: 'pod', color: '#a78bfa', name: 'Void spore' }] },
  r5: { id: 'r5', name: 'Celestial Throne', mote: '254,240,138', props: [{ kind: 'lantern', color: '#facc15', name: 'Sun lantern' }, { kind: 'crystal', color: '#fde68a', name: 'Halo crystal' }] },
  sky: { id: 'sky', name: 'Sky Realm', mote: '255,255,255', props: [{ kind: 'cloud', color: '#e2e8f0', name: 'Cloud puff' }, { kind: 'lantern', color: '#93c5fd', name: 'Wind lantern' }] },
  abyss: { id: 'abyss', name: 'The Abyss', mote: '251,146,60', props: [{ kind: 'brazier', color: '#ea580c', name: 'Lava vent' }, { kind: 'shard', color: '#f43f5e', name: 'Obsidian shard' }] },
  rift: { id: 'rift', name: 'Rift Between', mote: '216,180,254', props: [{ kind: 'shard', color: '#c084fc', name: 'Rift shard' }, { kind: 'crystal', color: '#f0abfc', name: 'Twilight crystal' }] },
};
export const IBG = { PROPS: 18, MOTES: 70, WAVES: 4, RIPPLES: 6, TOUCH_R: 46, REGROW: 20, REWARD_CAP_PER_MIN: 8, REWARD_XP: 4, REWARD_GOLD: 2, RING_MIN: 260, RING_MAX: 1150 } as const;

interface Prop { x: number; y: number; set: number; v: number; hp: number; down: number; wob: number; ph: number }
interface Wave { t: number; color: string; x: number; y: number }
interface Ripple { t: number; x: number; y: number }
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(kind: PropKind, color: string): HTMLCanvasElement {
  const k = kind + color; let c = sprites.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = 64; c.height = 80; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 46, 2, 32, 46, 30); gr.addColorStop(0, color + '88'); gr.addColorStop(1, color + '00'); g.fillStyle = gr; g.fillRect(0, 0, 64, 80);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(32, 72, 16, 5, 0, 0, 6.28); g.fill();
  g.fillStyle = color; g.strokeStyle = '#ffffffaa'; g.lineWidth = 1.5; g.beginPath();
  if (kind === 'crystal') { g.moveTo(32, 14); g.lineTo(44, 44); g.lineTo(32, 70); g.lineTo(20, 44); g.closePath(); }
  else if (kind === 'shard') { g.moveTo(30, 10); g.lineTo(38, 30); g.lineTo(42, 70); g.lineTo(22, 70); g.lineTo(26, 36); g.closePath(); }
  else if (kind === 'lantern') { g.arc(32, 40, 11, 0, 6.28); g.moveTo(32, 51); g.lineTo(32, 70); }
  else if (kind === 'pod') { g.ellipse(32, 54, 13, 16, 0, 0, 6.28); }
  else if (kind === 'stone') { g.moveTo(22, 70); g.lineTo(24, 26); g.quadraticCurveTo(32, 18, 40, 26); g.lineTo(42, 70); g.closePath(); }
  else if (kind === 'cloud') { g.arc(24, 52, 10, 0, 6.28); g.arc(36, 46, 13, 0, 6.28); g.arc(46, 54, 9, 0, 6.28); }
  else { g.moveTo(18, 52); g.lineTo(46, 52); g.lineTo(40, 70); g.lineTo(24, 70); g.closePath(); }
  g.fill(); g.stroke();
  if (kind === 'brazier') { g.fillStyle = '#fde047'; g.beginPath(); g.moveTo(24, 52); g.quadraticCurveTo(32, 20, 40, 52); g.fill(); }
  if (kind === 'stone') { g.strokeStyle = '#ffffff'; g.beginPath(); g.moveTo(28, 40); g.lineTo(36, 40); g.moveTo(32, 34); g.lineTo(32, 56); g.stroke(); }
  sprites.set(k, c); return c;
}

export class InteractiveBg {
  public enabled = true;
  public setId = 'r1';
  private props: Prop[] = [];
  private motes = new Float32Array(IBG.MOTES * 4); // x,y (0..1), depth, phase
  private waves: Wave[] = [];
  private ripples: Ripple[] = [];
  private rewardTimes: number[] = [];
  private tint = 0; private tintColor = '#ffffff';
  private seed = 1;
  public log = { touches: 0, breaks: 0, rewards: 0, capped: 0, waves: 0, ripples: 0, setChanges: 0 };
  constructor() { for (let i = 0; i < IBG.MOTES; i++) { this.motes[i * 4] = this.rnd(); this.motes[i * 4 + 1] = this.rnd(); this.motes[i * 4 + 2] = 0.15 + this.rnd() * 0.85; this.motes[i * 4 + 3] = this.rnd() * 6.28; } }
  private rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  get set(): BgSet { return IBG_SETS[this.setId] ?? IBG_SETS.r1; }
  public setScene(id: string) { if (id !== this.setId) { this.setId = id; this.props.length = 0; this.chunkProps.clear(); this.log.setChanges++; } }
  public state() { return { set: this.setId, enabled: this.enabled, props: this.props.length, intact: this.props.filter((p) => p.down <= 0).length, activeWaves: this.waves.length, activeRipples: this.ripples.length, rewardsLastMin: this.rewardTimes.length, ...this.log }; }
  public propList() { return this.props.map((p) => ({ x: p.x, y: p.y, down: p.down, kind: this.set.props[p.v].kind })); }
  /** v7: props are generated per world chunk (seeded by absolute chunk coords -> the same place always has the
   *  same scenery), loaded around the player and unloaded when far. Pool is capped. */
  private chunkProps = new Map<string, Prop[]>();
  public chunkStats = { loaded: 0, unloaded: 0 };
  private static CH = 640;
  private genChunk(ax: number, ay: number, ox: number, oy: number): Prop[] {
    let h = (Math.imul(ax, 73856093) ^ Math.imul(ay, 19349663) ^ Math.imul(this.setId.charCodeAt(this.setId.length - 1), 83492791)) >>> 0;
    const r = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return h / 4294967296; };
    const out: Prop[] = []; const n = r() < 0.75 ? (r() < 0.3 ? 2 : 1) : 0;
    for (let i = 0; i < n; i++) out.push({ x: ax * InteractiveBg.CH - ox + 60 + r() * 520, y: ay * InteractiveBg.CH - oy + 60 + r() * 520, set: 0, v: r() < 0.5 ? 0 : 1, hp: 1, down: 0, wob: 0, ph: r() * 6.28 });
    return out;
  }
  /** shift local coordinates after an origin rebase */
  public shift(dx: number, dy: number) { for (const p of this.props) { p.x -= dx; p.y -= dy; } for (const w of this.waves) { w.x -= dx; w.y -= dy; } for (const r of this.ripples) { r.x -= dx; r.y -= dy; } }
  /** returns reward events the engine turns into loot (already capped) */
  public update(dt: number, now: number, px: number, py: number, origin: { x: number; y: number }, onReward: (x: number, y: number, kind: 'xp' | 'gold') => void, onSfx: (n: string) => void) {
    if (!this.enabled) return;
    const CH = InteractiveBg.CH, R = Q.lod >= 2 ? 1 : 2;
    const pcx = Math.floor((px + origin.x) / CH), pcy = Math.floor((py + origin.y) / CH);
    let changed = false;
    for (const k of [...this.chunkProps.keys()]) { const [a, b] = k.split(',').map(Number); if (Math.abs(a - pcx) > R + 1 || Math.abs(b - pcy) > R + 1) { this.chunkProps.delete(k); this.chunkStats.unloaded++; changed = true; } }
    for (let a = pcx - R; a <= pcx + R; a++) for (let b = pcy - R; b <= pcy + R; b++) { const k = a + ',' + b; if (!this.chunkProps.has(k)) { this.chunkProps.set(k, this.genChunk(a, b, origin.x, origin.y)); this.chunkStats.loaded++; changed = true; } }
    if (changed || this.props.length === 0) { this.props.length = 0; for (const arr of this.chunkProps.values()) for (const p of arr) if (this.props.length < IBG.PROPS * 2) this.props.push(p); }
    while (this.rewardTimes.length && now - this.rewardTimes[0] > 60) this.rewardTimes.shift();
    for (const p of this.props) {
      p.wob = Math.max(0, p.wob - dt * 2.5);
      const d = Math.hypot(p.x - px, p.y - py);
      if (p.down > 0) { p.down -= dt; continue; }
      if (d < IBG.TOUCH_R) { this.log.touches++; p.wob = 1; p.down = IBG.REGROW; onSfx('chime'); this.reward(now, p, 'xp', onReward); }
    }
    for (let i = this.waves.length - 1; i >= 0; i--) { this.waves[i].t += dt; if (this.waves[i].t > 1.1) this.waves.splice(i, 1); }
    for (let i = this.ripples.length - 1; i >= 0; i--) { this.ripples[i].t += dt; if (this.ripples[i].t > 0.9) this.ripples.splice(i, 1); }
    this.tint = Math.max(0, this.tint - dt * 1.6);
  }
  private reward(now: number, p: Prop, kind: 'xp' | 'gold', cb: (x: number, y: number, k: 'xp' | 'gold') => void) {
    if (this.rewardTimes.length >= IBG.REWARD_CAP_PER_MIN) { this.log.capped++; return; }
    this.rewardTimes.push(now); this.log.rewards++; cb(p.x, p.y, kind);
  }
  /** a spell impact at (x,y) radius r: breaks intact props in range */
  public hitAt(x: number, y: number, r: number, now: number, onReward: (x: number, y: number, kind: 'xp' | 'gold') => void, onSfx: (n: string) => void) {
    if (!this.enabled) return 0; let n = 0;
    for (const p of this.props) if (p.down <= 0 && Math.abs(p.x - x) < r + 20 && Math.abs(p.y - y) < r + 20 && Math.hypot(p.x - x, p.y - y) < r + 20) { p.down = IBG.REGROW; p.wob = 1; n++; this.log.breaks++; this.reward(now, p, 'gold', onReward); }
    if (n) onSfx('shatter');
    return n;
  }
  /** background reacts to magic: tinted wave from the caster + mote flare */
  public magic(color: string, x: number, y: number) {
    if (!this.enabled) return; this.tint = 1; this.tintColor = color;
    if (this.waves.length >= IBG.WAVES) this.waves.shift();
    this.waves.push({ t: 0, color, x, y }); this.log.waves++;
  }
  public tap(x: number, y: number) {
    if (!this.enabled) return; if (this.ripples.length >= IBG.RIPPLES) this.ripples.shift();
    this.ripples.push({ t: 0, x, y }); this.log.ripples++;
    for (const p of this.props) if (Math.hypot(p.x - x, p.y - y) < 120) p.wob = 1;
  }
  /** screen-space parallax motes; call with identity transform */
  public renderFar(ctx: CanvasRenderingContext2D, camX: number, camY: number, flyH: number, now: number) {
    if (!this.enabled) return;
    const w = ctx.canvas.width, h = ctx.canvas.height, m = this.motes, n = Q.lod >= 2 ? 30 : IBG.MOTES;
    const spread = 1 + 0.35 * flyH; // higher = the world drops away: motes rush outward and shrink
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgb(${this.set.mote})`;
    for (let i = 0; i < n; i++) {
      const dep = m[i * 4 + 2];
      let x = (m[i * 4] - camX * dep * 0.00025) % 1; if (x < 0) x += 1;
      let y = (m[i * 4 + 1] - camY * dep * 0.00025 + now * 0.004 * dep) % 1; if (y < 0) y += 1;
      const sx = w / 2 + (x - 0.5) * w * spread, sy = h / 2 + (y - 0.5) * h * spread;
      const s = (1.2 + dep * 2.4) / (1 + 0.25 * flyH) * (1 + this.tint * 0.8);
      ctx.globalAlpha = (0.25 + 0.5 * dep) * (0.6 + 0.4 * Math.sin(now * 2 + m[i * 4 + 3]));
      ctx.fillRect(sx, sy, s, s);
    }
    if (this.tint > 0.02) { ctx.globalAlpha = this.tint * 0.10; ctx.fillStyle = this.tintColor; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }
  /** world-space props + waves + ripples */
  public renderProps(ctx: CanvasRenderingContext2D, now: number, onScreen: (x: number, y: number, m: number) => boolean) {
    if (!this.enabled) return; const S = this.set;
    for (const p of this.props) {
      if (!onScreen(p.x, p.y, 60)) continue;
      const def = S.props[p.v]; const img = sprite(def.kind, def.color);
      const regrow = p.down > 0 ? Math.max(0, 1 - p.down / IBG.REGROW) : 1;
      const sc = p.down > 0 ? 0.35 + 0.35 * regrow : 1;
      ctx.save(); ctx.translate(p.x, p.y + Math.sin(now * 1.5 + p.ph) * 2); ctx.rotate(Math.sin(now * 25) * 0.25 * p.wob); ctx.scale(sc, sc);
      ctx.globalAlpha = p.down > 0 ? 0.35 : 1; ctx.drawImage(img, -32, -72); ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const wv of this.waves) { const k = wv.t / 1.1; ctx.globalAlpha = (1 - k) * 0.45; ctx.strokeStyle = wv.color; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(wv.x, wv.y, 60 + k * 520, (60 + k * 520) * 0.6, 0, 0, 6.28); ctx.stroke(); }
    for (const r of this.ripples) { const k = r.t / 0.9; ctx.strokeStyle = `rgb(${S.mote})`; for (const o of [0, 0.25]) { const kk = Math.max(0, k - o); if (kk <= 0) continue; ctx.globalAlpha = (1 - kk) * 0.7; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(r.x, r.y, 10 + kk * 110, (10 + kk * 110) * 0.6, 0, 0, 6.28); ctx.stroke(); } }
    ctx.restore();
  }
}
