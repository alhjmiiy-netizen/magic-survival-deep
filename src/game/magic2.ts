/**
 * v7 runtime for the twelve new spells (spells2.ts). One pooled entity list, each entity a small
 * state machine with its own update + distinct canvas visual. The engine supplies a Host adapter
 * so this file never touches engine privates.
 */
import type { Enemy, Spell } from '../types/game';
import type { Element } from './deep';
import { FX } from './FX';
import { SPELL2_BY_ID } from './spells2';

export interface Host {
  enemies: Enemy[];
  px(): number; py(): number; facing(): number; time(): number;
  hit(e: Enemy, dmg: number, color: string, el: Element): void;
  densest(r: number): { x: number; y: number } | null;
  nearest(x: number, y: number, max: number): Enemy | null;
  beam(x1: number, y1: number, x2: number, y2: number, color: string): void;
  zone(x: number, y: number, r: number, dur: number, dps: number, rgb: string): void;
  heal(n: number): void; shake(n: number): void; sfx(name: string, size: number): void;
  onScreen(x: number, y: number, m: number): boolean;
}

type Kind = 'meteor' | 'field' | 'orb' | 'cloud' | 'cyclone' | 'scythe' | 'spike' | 'well' | 'wave' | 'pillar' | 'circle';
interface Ent {
  on: boolean; kind: Kind; spell: string; tier: number; x: number; y: number; vx: number; vy: number;
  t: number; life: number; r: number; dmg: number; color: string; n: number; a: number; tick: number;
  hitT: Map<Enemy, number>; done: boolean; ox: number; oy: number;
}
const MAX_ENTS = 220;
const TAU = Math.PI * 2;
const d2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);


const BLOBS = new Map<string, HTMLCanvasElement>();
/** pre-rendered radial gradient sprite (cheap drawImage instead of per-frame gradients) */
function blob(stops: [number, string][]) {
  const key = stops.map((q) => q.join(':')).join('|'); let c = BLOBS.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); for (const [o, col] of stops) g.addColorStop(o, col); x.fillStyle = g; x.fillRect(0, 0, 64, 64); BLOBS.set(key, c); return c;
}
function drawBlob(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, r: number, ry = r) { ctx.drawImage(img, x - r, y - ry, r * 2, ry * 2); }
const B_METEOR: [number, string][] = [[0, '#fff7cc'], [0.4, '#fb923c'], [1, 'rgba(239,68,68,0)']];
const B_CLOUD: [number, string][] = [[0, 'rgba(190,242,100,0.5)'], [1, 'rgba(77,124,15,0)']];

export class Magic2 {
  ents: Ent[] = [];
  log = { casts: {} as Record<string, number>, hits: {} as Record<string, number>, dmg: {} as Record<string, number> };
  constructor(public h: Host) {}
  get active() { let n = 0; for (const e of this.ents) if (e.on) n++; return n; }
  reset() { for (const e of this.ents) { e.on = false; e.hitT.clear(); } this.log = { casts: {}, hits: {}, dmg: {} }; }
  shift(dx: number, dy: number) { for (const e of this.ents) if (e.on) { e.x -= dx; e.y -= dy; e.ox -= dx; e.oy -= dy; } }

  /** live entity budget; the engine lowers it under heavy load (LOD 2) */
  public budget = MAX_ENTS;
  private countKind(k: Kind) { let n = 0; for (const e of this.ents) if (e.on && e.kind === k) n++; return n; }
  private spawn(kind: Kind, sp: Spell, x: number, y: number, life: number, r: number, dmg: number): Ent {
    let e = this.active >= this.budget ? undefined : this.ents.find((q) => !q.on);
    if (!e && this.active >= this.budget) e = this.ents.filter((q) => q.on).reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
    if (!e) {
      if (this.ents.length < MAX_ENTS) { e = { hitT: new Map() } as Ent; this.ents.push(e); }
      else { e = this.ents.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b)); }
    }
    Object.assign(e, { on: true, kind, spell: sp.id, tier: sp.tier ?? 0, x, y, vx: 0, vy: 0, t: 0, life, r, dmg, color: sp.color, n: 0, a: 0, tick: 0, done: false, ox: x, oy: y });
    e.hitT.clear();
    return e;
  }
  private dmgTo(e: Ent, en: Enemy, dmg: number) {
    const el = (SPELL2_BY_ID[e.spell]?.el ?? 'arcane') as Element;
    const before = en.hp; this.h.hit(en, Math.round(dmg), e.color, el);
    this.log.hits[e.spell] = (this.log.hits[e.spell] ?? 0) + 1; this.log.dmg[e.spell] = (this.log.dmg[e.spell] ?? 0) + Math.max(0, before - en.hp);
  }
  private inR(x: number, y: number, r: number) { const o: Enemy[] = []; for (const en of this.h.enemies) if (d2(en.x, en.y, x, y) <= (r + en.radius) * (r + en.radius)) o.push(en); return o; }
  private targets(n: number, maxD: number) {
    const px = this.h.px(), py = this.h.py(); const m = maxD * maxD;
    const c = this.h.enemies.filter((e) => d2(e.x, e.y, px, py) < m);
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    return c.slice(0, n);
  }

  /** Cast one of the new spells (sp already has evolution/artifact modifiers). Returns true if handled. */
  cast(sp: Spell): boolean {
    const def = SPELL2_BY_ID[sp.id]; if (!def) return false;
    const h = this.h; const px = h.px(), py = h.py(); const tier = sp.tier ?? 0;
    this.log.casts[sp.id] = (this.log.casts[sp.id] ?? 0) + 1;
    h.sfx('sp_' + sp.id, Math.min(2, 0.8 + 0.25 * tier + sp.level * 0.04));
    switch (sp.id) {
      case 'meteor_shower': {
        const tg = this.targets(sp.count, 700);
        for (let i = 0; i < sp.count; i++) {
          const t = tg[i % Math.max(1, tg.length)];
          const x = t ? t.x + (Math.random() - 0.5) * 60 : px + (Math.random() - 0.5) * 700, y = t ? t.y + (Math.random() - 0.5) * 60 : py + (Math.random() - 0.5) * 500;
          const m = this.spawn('meteor', sp, x, y, 0.55 + i * 0.09, sp.area, sp.damage); m.n = i;
        }
        break;
      }
      case 'chain_lightning': {
        const chains = 1 + (tier >= 2 ? 2 : 0);
        for (let c = 0; c < chains; c++) {
          let prev = { x: px, y: py }; const used = new Set<Enemy>();
          for (let k = 0; k < sp.count; k++) {
            let best: Enemy | null = null, bd = sp.area * sp.area;
            for (const en of h.enemies) { if (used.has(en)) continue; const dd = d2(en.x, en.y, prev.x, prev.y); if (dd < bd) { bd = dd; best = en; } }
            if (!best) break; used.add(best);
            h.beam(prev.x, prev.y - (k ? 10 : 40), best.x, best.y - 10, k % 2 ? '#fef9c3' : sp.color);
            const ent = this.spawn('pillar', sp, best.x, best.y, 0.18, 26, 0); ent.done = true; ent.n = -1;
            this.dmgTo(ent, best, sp.damage * Math.pow(0.95, k));
            if (tier >= 2) best.frozenUntil = Math.max(best.frozenUntil ?? 0, performance.now() + 250);
            if (tier >= 1) { const f = h.enemies.find((q) => !used.has(q) && d2(q.x, q.y, best!.x, best!.y) < 160 * 160); if (f) { used.add(f); h.beam(best.x, best.y - 10, f.x, f.y - 10, '#fde047'); this.dmgTo(ent, f, sp.damage * 0.6); } }
            prev = best;
          }
        }
        break;
      }
      case 'electric_zone': { const f = this.spawn('field', sp, px, py, tier >= 1 ? 4.5 : 3, sp.area, sp.damage); f.n = sp.count; break; }
      case 'satellite_orbs': {
        for (const e of this.ents) if (e.on && e.kind === 'orb') e.on = false; // refresh ring
        const rings = tier >= 1 ? 2 : 1;
        for (let ring = 0; ring < rings; ring++) for (let i = 0; i < sp.count; i++) {
          const o = this.spawn('orb', sp, px, py, tier >= 2 ? sp.cooldown + 0.3 : 5, sp.area * (ring ? 0.62 : 1), sp.damage);
          o.a = (i / sp.count) * TAU + ring * 0.4; o.n = ring ? -1 : 1;
        }
        break;
      }
      case 'poison_cloud': {
        for (let i = 0; i < sp.count; i++) {
          const c = h.densest(220) ?? { x: px + Math.cos(i * 2.1) * 200, y: py + Math.sin(i * 2.1) * 160 };
          this.spawn('cloud', sp, c.x + (i ? (Math.random() - 0.5) * 240 : 0), c.y + (i ? (Math.random() - 0.5) * 200 : 0), 5, sp.area, sp.damage);
        }
        break;
      }
      case 'cyclone': {
        for (let i = 0; i < sp.count; i++) {
          const a = h.facing() + (i - (sp.count - 1) / 2) * 0.9; const c = this.spawn('cyclone', sp, px + Math.cos(a) * 40, py + Math.sin(a) * 40, 4.2, sp.area, sp.damage);
          c.vx = Math.cos(a) * 150; c.vy = Math.sin(a) * 150; c.a = a;
        }
        break;
      }
      case 'gale_scythe': {
        const ring = tier >= 2; const t = h.nearest(px, py, 700); const base = t ? Math.atan2(t.y - py, t.x - px) : h.facing();
        for (let i = 0; i < sp.count; i++) {
          const a = ring ? base + (i / sp.count) * TAU : base + (i - (sp.count - 1) / 2) * 0.28;
          const s = this.spawn('scythe', sp, px, py, 1.2, sp.area, sp.damage); s.a = a; s.vx = Math.cos(a) * 620; s.vy = Math.sin(a) * 620; s.n = tier >= 1 ? 1 : 0;
        }
        break;
      }
      case 'stone_spikes': {
        const t = h.nearest(px, py, 800); const base = t ? Math.atan2(t.y - py, t.x - px) : h.facing();
        const lines = tier >= 2 ? 8 : tier >= 1 ? 3 : 1;
        for (let L = 0; L < lines; L++) {
          const a = tier >= 2 ? base + (L / lines) * TAU : base + (L - (lines - 1) / 2) * 0.45;
          for (let i = 0; i < sp.count; i++) { const dd = 50 + i * sp.area * 1.05; const s = this.spawn('spike', sp, px + Math.cos(a) * dd, py + Math.sin(a) * dd, 0.75, sp.area, sp.damage); s.t = -i * 0.045; s.a = Math.random() * TAU; }
        }
        break;
      }
      case 'gravity_well': {
        for (let i = 0; i < sp.count; i++) { const c = h.densest(sp.area) ?? { x: px + Math.cos(i * 2.4 + 1) * 220, y: py + Math.sin(i * 2.4 + 1) * 180 }; this.spawn('well', sp, c.x + (i ? (Math.random() - 0.5) * 300 : 0), c.y + (i ? (Math.random() - 0.5) * 240 : 0), 2.2, sp.area, sp.damage); }
        break;
      }
      case 'tidal_wave': {
        const t = h.nearest(px, py, 800); const base = t ? Math.atan2(t.y - py, t.x - px) : h.facing();
        for (let i = 0; i < sp.count; i++) { const a = base + (i / sp.count) * TAU; const w = this.spawn('wave', sp, px, py, 1.3, sp.area, sp.damage); w.a = a; w.n = tier >= 1 ? 1 : 0; }
        break;
      }
      case 'holy_smite': {
        const tough = [...h.enemies].filter((e) => h.onScreen(e.x, e.y, 60)).sort((a, b) => b.hp - a.hp).slice(0, sp.count);
        if (!tough.length) tough.push(...this.targets(1, 600));
        tough.forEach((en, i) => {
          this.spawn('pillar', sp, en.x, en.y, 0.9, sp.area, sp.damage).t = -i * 0.08;
          if (tier >= 2) for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; this.spawn('pillar', sp, en.x + Math.cos(a) * sp.area * 1.6, en.y + Math.sin(a) * sp.area * 1.6, 0.9, sp.area * 0.7, sp.damage * 0.6).t = -0.15 - k * 0.05; }
        });
        break;
      }
      case 'magic_circle': {
        const grand = tier >= 2; const n = grand ? 1 : sp.count;
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const off = n > 1 ? sp.area * 0.9 : 0; const c = this.spawn('circle', sp, px + Math.cos(a) * off, py + Math.sin(a) * off, 3.1, sp.area, sp.damage); c.n = n > 1 ? i : -1; c.a = a; }
        break;
      }
    }
    return true;
  }

  update(dt: number) {
    const h = this.h; const px = h.px(), py = h.py(); const T = h.time();
    for (const e of this.ents) {
      if (!e.on) continue;
      e.t += dt; if (e.t > e.life) { e.on = false; e.hitT.clear(); continue; }
      if (e.t < 0) continue;
      switch (e.kind) {
        case 'meteor': if (!e.done && e.t >= e.life - 0.12) { e.done = true; if (e.n < 4) FX.fire(e.x, e.y, e.r); FX.ring(e.x, e.y, e.r * 1.3, 'rgba(255,170,60,1)', 0.5); for (const en of this.inR(e.x, e.y, e.r)) this.dmgTo(e, en, e.dmg); if (e.n === 0) h.shake(6 + 3 * e.tier); if (e.n === 0) h.zone(e.x, e.y, e.r * 0.8, 1.5 + e.tier, e.dmg * 0.3, '249,115,22'); if (e.tier >= 1) for (let k = 0; k < 3; k++) { const a = Math.random() * TAU; const s = this.spawn('pillar', { id: e.spell, color: '#fb923c', tier: 0 } as Spell, e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, 0.35, e.r * 0.4, 0); s.n = -1; for (const en of this.inR(s.x, s.y, s.r)) this.dmgTo(e, en, e.dmg * 0.35); } } break;
        case 'field': {
          if (e.tier >= 1) { e.x = px; e.y = py; }
          e.tick -= dt; if (e.tick <= 0) { e.tick = 0.35; const c = this.inR(e.x, e.y, e.r); for (let k = 0; k < e.n && c.length; k++) { const en = c.splice(Math.floor(Math.random() * c.length), 1)[0]; h.beam(e.x + (Math.random() - 0.5) * 30, e.y - 30, en.x, en.y - 10, e.color); this.dmgTo(e, en, e.dmg); } }
          break;
        }
        case 'orb': {
          e.a += dt * (2.6 + 0.4 * e.tier) * e.n; e.x = px + Math.cos(e.a) * e.r; e.y = py + Math.sin(e.a) * e.r * 0.8;
          const rr = 20 + 6 * e.tier; for (const en of this.inR(e.x, e.y, rr)) { const lt = e.hitT.get(en) ?? -9; if (T - lt > 0.45) { e.hitT.set(en, T); this.dmgTo(e, en, e.dmg); FX.flash(en.x, en.y, 26, e.color); } }
          if (e.hitT.size > 64) e.hitT.clear();
          break;
        }
        case 'cloud': {
          if (e.tier >= 1) { const t = h.nearest(e.x, e.y, 400); if (t) { e.x += Math.sign(t.x - e.x) * 40 * dt; e.y += Math.sign(t.y - e.y) * 40 * dt; } }
          e.tick -= dt; if (e.tick <= 0) { e.tick = 0.5; for (const en of this.inR(e.x, e.y, e.r)) { this.dmgTo(e, en, e.dmg); en.slowUntil = T + 0.8; if (e.tier >= 2 && en.hp <= 0 && this.countKind('cloud') < 9) this.spawn('cloud', { id: e.spell, color: e.color, tier: 0 } as Spell, en.x, en.y, 2.5, e.r * 0.6, e.dmg * 0.6); } }
          break;
        }
        case 'cyclone': {
          e.a += dt * 1.4; e.vx += Math.cos(e.a * 1.7) * 90 * dt; e.vy += Math.sin(e.a * 1.3) * 90 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.tier >= 1) e.r *= 1 + 0.12 * dt;
          const pull = e.r * 3; for (const en of this.inR(e.x, e.y, pull)) { if (en.isBoss) continue; const dx = e.x - en.x, dy = e.y - en.y, dd = Math.hypot(dx, dy) || 1; const k = (e.tier >= 1 ? 170 : 120) * dt; en.x += (dx / dd) * Math.min(dd, k); en.y += (dy / dd) * Math.min(dd, k); }
          e.tick -= dt; if (e.tick <= 0) { e.tick = 0.3; for (const en of this.inR(e.x, e.y, e.r)) this.dmgTo(e, en, e.dmg); }
          break;
        }
        case 'scythe': {
          if (e.n === 1 && e.t > e.life * 0.5) { const dx = px - e.x, dy = py - e.y, dd = Math.hypot(dx, dy) || 1; e.vx = (dx / dd) * 700; e.vy = (dy / dd) * 700; if (e.t > e.life * 0.5 && e.t < e.life * 0.5 + dt * 1.5) e.hitT.clear(); }
          e.x += e.vx * dt; e.y += e.vy * dt; e.a = Math.atan2(e.vy, e.vx);
          for (const en of this.inR(e.x, e.y, e.r)) if (!e.hitT.has(en)) { e.hitT.set(en, T); this.dmgTo(e, en, e.dmg); }
          break;
        }
        case 'spike': if (!e.done && e.t >= 0.08) { e.done = true; for (const en of this.inR(e.x, e.y, e.r)) { this.dmgTo(e, en, e.dmg); if (!en.isBoss) en.frozenUntil = Math.max(en.frozenUntil ?? 0, performance.now() + 400); } } break;
        case 'well': {
          const pull = (e.tier >= 1 ? 260 : 180) * dt;
          for (const en of this.inR(e.x, e.y, e.r * 1.6)) { if (en.isBoss) continue; const dx = e.x - en.x, dy = e.y - en.y, dd = Math.hypot(dx, dy) || 1; en.x += (dx / dd) * Math.min(dd, pull); en.y += (dy / dd) * Math.min(dd, pull); }
          if (!e.done && e.t >= e.life - 0.15) { e.done = true; FX.star(e.x, e.y, e.r); FX.ring(e.x, e.y, e.r * (e.tier >= 2 ? 2.2 : 1.2), 'rgba(253,224,71,1)', 0.6); h.shake(8); for (const en of this.inR(e.x, e.y, e.r * (e.tier >= 2 ? 1.8 : 1))) { this.dmgTo(e, en, e.dmg); if (e.tier >= 1) this.dmgTo(e, en, e.dmg * 0.5); } }
          break;
        }
        case 'wave': {
          const back = e.n === 1 && e.t > e.life * 0.6; const prog = back ? 1 - (e.t - e.life * 0.6) / (e.life * 0.4) * 0.6 : Math.min(1, e.t / (e.life * 0.6));
          const dist = 40 + prog * 520; e.x = e.ox + Math.cos(e.a) * dist; e.y = e.oy + Math.sin(e.a) * dist;
          if (back && !e.done) { e.done = true; e.hitT.clear(); }
          const ca = Math.cos(e.a), sa = Math.sin(e.a);
          for (const en of h.enemies) { const dx = en.x - e.x, dy = en.y - e.y; const along = dx * ca + dy * sa, perp = -dx * sa + dy * ca; if (Math.abs(along) < 34 + en.radius && Math.abs(perp) < e.r * 0.5) { if (!e.hitT.has(en)) { e.hitT.set(en, T); this.dmgTo(e, en, e.dmg); en.slowUntil = T + 1.5; } if (!en.isBoss && !back) { en.x += ca * 260 * dt; en.y += sa * 260 * dt; } } }
          break;
        }
        case 'pillar': if (!e.done && e.t >= 0.12 && e.n !== -1) { e.done = true; FX.flash(e.x, e.y, e.r * 1.6, '#fffbeb'); FX.ring(e.x, e.y, e.r * 1.4, 'rgba(254,240,138,1)', 0.45); for (const en of this.inR(e.x, e.y, e.r)) { this.dmgTo(e, en, e.dmg); if (e.tier >= 1) { h.heal(1); if (!en.isBoss) en.frozenUntil = Math.max(en.frozenUntil ?? 0, performance.now() + 500); } } } break;
        case 'circle': {
          if (e.n === -1) { e.x = px; e.y = py; } else { e.x = px + Math.cos(e.a + e.t * 0.8) * e.r * 0.9; e.y = py + Math.sin(e.a + e.t * 0.8) * e.r * 0.9; }
          e.tick -= dt; if (e.tick <= 0) { e.tick = 0.5; FX.ring(e.x, e.y, e.r, 'rgba(254,243,199,1)', 0.35); for (const en of this.inR(e.x, e.y, e.r)) { this.dmgTo(e, en, e.dmg); if (e.tier >= 1) en.slowUntil = T + 0.6; } if (e.tier >= 2) h.heal(3); }
          break;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number) {
    const h = this.h;
    ctx.save();
    for (const e of this.ents) {
      if (!e.on || e.t < 0 || !h.onScreen(e.x, e.y, e.r * 3 + 200)) continue;
      const k = e.t / e.life; const fade = Math.min(1, (1 - k) * 4, e.t * 8 + 0.2);
      switch (e.kind) {
        case 'meteor': {
          if (e.done) break;
          const fall = 1 - Math.min(1, e.t / (e.life - 0.12)); const H = 520 * fall; const sx = e.x + H * 0.45, sy = e.y - H;
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.25 + 0.5 * (1 - fall); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * (1 - fall * 0.6), e.r * 0.45 * (1 - fall * 0.6), 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r, e.r * 0.45, 0, 0, TAU); ctx.stroke();
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
          ctx.lineCap = 'round'; ctx.strokeStyle = '#ff6a20'; ctx.globalAlpha = 0.35; ctx.lineWidth = 14 + 5 * e.tier; ctx.beginPath(); ctx.moveTo(sx + 90, sy - 170); ctx.lineTo(sx, sy); ctx.stroke(); ctx.strokeStyle = '#ffd27a'; ctx.globalAlpha = 0.8; ctx.lineWidth = 5 + 2 * e.tier; ctx.beginPath(); ctx.moveTo(sx + 55, sy - 100); ctx.lineTo(sx, sy); ctx.stroke(); ctx.globalAlpha = 1;
          drawBlob(ctx, blob(B_METEOR), sx, sy, 26 + 8 * e.tier);
          break;
        }
        case 'field': {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 * fade; const g = ctx.createRadialGradient(e.x, e.y, e.r * 0.2, e.x, e.y, e.r); g.addColorStop(0, 'rgba(253,224,71,0)'); g.addColorStop(1, 'rgba(253,224,71,0.9)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.85 * fade; ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
          for (let i = 0; i < 7; i++) { const a0 = now * 3 + i * 0.9 + Math.sin(now * 13 + i) * 0.3; ctx.beginPath(); let x = e.x + Math.cos(a0) * e.r, y = e.y + Math.sin(a0) * e.r; ctx.moveTo(x, y); for (let s = 1; s < 5; s++) { const a = a0 + s * 0.08; const rr = e.r * (1 - s * 0.05) + (Math.random() - 0.5) * 14; x = e.x + Math.cos(a) * rr; y = e.y + Math.sin(a) * rr; ctx.lineTo(x, y); } ctx.stroke(); }
          ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -now * 80; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          break;
        }
        case 'orb': {
          ctx.globalCompositeOperation = 'lighter'; const R = 14 + 5 * e.tier;
          ctx.globalAlpha = 0.35 * fade; ctx.strokeStyle = e.color; ctx.lineWidth = R * 0.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(h.px(), h.py(), e.r, e.r * 0.8, 0, e.a - 0.5 * e.n, e.a, e.n < 0); ctx.stroke();
          ctx.globalAlpha = fade; const g = ctx.createRadialGradient(e.x, e.y - 10, 1, e.x, e.y - 10, R * 1.8); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, e.color); g.addColorStop(1, 'rgba(168,85,247,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y - 10, R * 1.8, 0, TAU); ctx.fill();
          break;
        }
        case 'cloud': {
          ctx.globalCompositeOperation = 'source-over';
          for (let i = 0; i < 4; i++) { const a = i * 1.57 + now * 0.4 * (i % 2 ? 1 : -1); const rr = e.r * (0.35 + 0.18 * Math.sin(now * 1.3 + i)); const x = e.x + Math.cos(a) * e.r * 0.45, y = e.y + Math.sin(a) * e.r * 0.3; ctx.globalAlpha = fade; drawBlob(ctx, blob(B_CLOUD), x, y, rr); }
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#d9f99d'; ctx.globalAlpha = 0.7 * fade;
          for (let i = 0; i < 6; i++) { const ph = (now * 0.7 + i * 0.37) % 1; const x = e.x + Math.sin(i * 7.3) * e.r * 0.6, y = e.y + Math.cos(i * 3.1) * e.r * 0.3 - ph * 40; ctx.beginPath(); ctx.arc(x, y, 3 + 3 * (1 - ph), 0, TAU); ctx.fill(); }
          ctx.font = `${Math.round(e.r * 0.35)}px serif`; ctx.textAlign = 'center'; ctx.globalAlpha = 0.35 * fade; ctx.fillText('☠', e.x, e.y + e.r * 0.1);
          break;
        }
        case 'cyclone': {
          ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3;
          for (let i = 0; i < 8; i++) { const y = e.y - i * e.r * 0.32; const rr = e.r * (0.35 + i * 0.13); ctx.globalAlpha = (0.65 - i * 0.05) * fade; ctx.strokeStyle = i % 2 ? '#ecfdf5' : e.color; const a0 = now * 9 + i; ctx.beginPath(); ctx.ellipse(e.x + Math.sin(now * 4 + i * 0.6) * 6 * i, y, rr, rr * 0.3, 0, a0, a0 + 4.2); ctx.stroke(); }
          ctx.globalAlpha = 0.25 * fade; ctx.fillStyle = e.color; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r, e.r * 0.35, 0, 0, TAU); ctx.fill();
          break;
        }
        case 'scythe': {
          ctx.globalCompositeOperation = 'lighter'; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a); ctx.globalAlpha = fade;
          const R = e.r * 1.3; const g = ctx.createLinearGradient(-R, 0, R * 0.6, 0); g.addColorStop(0, 'rgba(110,231,183,0)'); g.addColorStop(1, '#ecfdf5'); ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, R, -1.25, 1.25); ctx.arc(-R * 0.45, 0, R * 0.95, 1.05, -1.05, true); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(167,243,208,0.5)'; ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(-i * 22, 0, R * 0.9, -0.9, 0.9); ctx.stroke(); }
          ctx.restore();
          break;
        }
        case 'spike': {
          const up = Math.min(1, e.t / 0.1), down = e.t > e.life - 0.25 ? (e.life - e.t) / 0.25 : 1; const H = e.r * 2.1 * up * down;
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.5 * down; ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 0.9, e.r * 0.35, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = down;
          for (let i = -1; i <= 1; i++) { const w = e.r * (i ? 0.32 : 0.45), hh = H * (i ? 0.65 : 1), x = e.x + i * e.r * 0.42; ctx.fillStyle = i ? '#78350f' : '#a16207'; ctx.beginPath(); ctx.moveTo(x - w, e.y); ctx.lineTo(x + Math.sin(e.a + i) * 4, e.y - hh); ctx.lineTo(x + w, e.y); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(253,230,138,0.35)'; ctx.beginPath(); ctx.moveTo(x, e.y); ctx.lineTo(x + Math.sin(e.a + i) * 4, e.y - hh); ctx.lineTo(x + w, e.y); ctx.closePath(); ctx.fill(); }
          break;
        }
        case 'well': {
          const pulse = e.done ? 0 : 1; const R = e.r * (1 - 0.5 * k);
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.75 * fade * pulse; const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, R); g.addColorStop(0, '#000'); g.addColorStop(0.35, 'rgba(30,10,40,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, R, R * 0.6, 0, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.5;
          for (let i = 0; i < 5; i++) { const rr = R * (1 - ((now * 0.9 + i / 5) % 1)); ctx.globalAlpha = 0.7 * fade * pulse; ctx.strokeStyle = i % 2 ? '#fde68a' : '#a16207'; ctx.beginPath(); ctx.ellipse(e.x, e.y, rr, rr * 0.6, 0, now * 3 + i, now * 3 + i + 4); ctx.stroke(); }
          break;
        }
        case 'wave': {
          ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a); ctx.globalAlpha = 0.85 * fade;
          const W = e.r * 0.5; const g = ctx.createLinearGradient(-60, 0, 30, 0); g.addColorStop(0, 'rgba(30,64,175,0)'); g.addColorStop(0.6, 'rgba(59,130,246,0.85)'); g.addColorStop(1, 'rgba(191,219,254,0.95)'); ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(-70, -W); ctx.quadraticCurveTo(40, 0, -70, W); ctx.lineTo(-90, W); ctx.quadraticCurveTo(0, 0, -90, -W); ctx.closePath(); ctx.fill();
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#eff6ff'; for (let i = 0; i < 12; i++) { const yy = -W + (i / 11) * 2 * W; const xx = 30 * (1 - (yy / W) ** 2) - 34 + Math.sin(now * 12 + i) * 5; ctx.beginPath(); ctx.arc(xx, yy, 3 + (i % 3), 0, TAU); ctx.fill(); }
          ctx.restore();
          break;
        }
        case 'pillar': {
          if (e.n === -1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade; ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1 - k), 0, TAU); ctx.fill(); break; }
          const a = Math.min(1, e.t / 0.12) * fade; ctx.globalCompositeOperation = 'lighter';
          const w = e.r * (0.55 + 0.25 * Math.sin(now * 30)); const g = ctx.createLinearGradient(e.x - w, 0, e.x + w, 0); g.addColorStop(0, 'rgba(254,240,138,0)'); g.addColorStop(0.5, 'rgba(255,255,240,0.95)'); g.addColorStop(1, 'rgba(254,240,138,0)');
          ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(e.x - w, e.y - 900, w * 2, 900);
          ctx.globalAlpha = a * 0.8; drawBlob(ctx, blob([[0, '#fffbeb'], [1, 'rgba(253,224,71,0)']]), e.x, e.y, e.r * 1.3, e.r * 0.55);
          break;
        }
        case 'circle': {
          ctx.globalCompositeOperation = 'lighter'; ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.62); ctx.globalAlpha = 0.85 * fade; ctx.strokeStyle = e.color; ctx.lineWidth = 3;
          const R = e.r * Math.min(1, e.t * 5); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R * 0.86, 0, TAU); ctx.stroke();
          ctx.rotate(now * 0.8); ctx.lineWidth = 2.2; ctx.beginPath(); for (let i = 0; i < 2; i++) { for (let j = 0; j <= 3; j++) { const a = (j / 3) * TAU + i * Math.PI / 3; const x = Math.cos(a) * R * 0.84, y = Math.sin(a) * R * 0.84; if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); } } ctx.stroke();
          ctx.rotate(-now * 1.6); ctx.font = `${Math.max(10, R * 0.12)}px serif`; ctx.fillStyle = '#fde68a'; ctx.textAlign = 'center'; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i], Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93 + 4); }
          const pulse = 1 - (e.tick / 0.5); ctx.globalAlpha = 0.25 * pulse * fade; ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
    ctx.restore();
  }
}
