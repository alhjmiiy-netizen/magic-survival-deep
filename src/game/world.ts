/**
 * v7 endless world. The ground is an infinite grid of procedurally generated chunks, seeded by
 * (region seed, absolute chunk coords) so the same place always looks the same. Chunks are rendered
 * once into small offscreen canvases kept in an LRU (bounded memory), and unloaded when far away.
 * Biomes (low-frequency noise): flagstone, ruins, grove (trees/bushes), crystal field, ember field.
 * Float precision: the engine rebases its local origin (see GameEngine.rebase) and passes the integer
 * world offset here, so absolute coordinates of ~1e6+ stay pixel-stable.
 */
import { mulberry32, Q } from './ArtKit';

export const CHUNK = 640;           // world px per chunk
const RES = 0.5;                    // offscreen pixels per world px
const LRU_MAX = 36;                 // ~36 * 320*320*4 = 14.7 MB cap
const GEN_PER_FRAME = 3;            // spread generation cost
export const REBASE_AT = 40000;     // |local| above this -> shift origin (multiple of CHUNK)

export interface WorldTheme { seed: number; stone: [number, number, number]; rune: string; ember: string; crystal: string; crack: string }
export type Biome = 'flagstone' | 'ruins' | 'grove' | 'crystal' | 'ember';

const ih = (x: number, y: number, s: number) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = ih(xi, yi, s), b = ih(xi + 1, yi, s), c = ih(xi, yi + 1, s), d = ih(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function biomeAt(ax: number, ay: number, seed: number): Biome {
  const n = vnoise(ax / 2600, ay / 2600, seed) * 0.7 + vnoise(ax / 900, ay / 900, seed + 9) * 0.3;
  return n < 0.3 ? 'grove' : n < 0.5 ? 'flagstone' : n < 0.66 ? 'ruins' : n < 0.82 ? 'crystal' : 'ember';
}
const rgb = (c: [number, number, number], k: number, a = 1) => `rgba(${Math.max(0, Math.min(255, c[0] * k)) | 0},${Math.max(0, Math.min(255, c[1] * k)) | 0},${Math.max(0, Math.min(255, c[2] * k)) | 0},${a})`;

interface Chunk { key: string; cx: number; cy: number; c: HTMLCanvasElement; used: number; biome: Biome; embers: Float32Array }

export class WorldGround {
  private chunks = new Map<string, Chunk>();
  private theme: WorldTheme | null = null; private themeSeed = -1;
  public stats = { generated: 0, unloaded: 0, live: 0, drawn: 0, pending: 0 };
  private frame = 0;
  setTheme(t: WorldTheme) { if (t.seed !== this.themeSeed) { this.theme = t; this.themeSeed = t.seed; this.clear(); } }
  clear() { this.stats.unloaded += this.chunks.size; this.chunks.clear(); }
  get size() { return this.chunks.size; }

  /** Draws the ground covering the view. World transform is applied; (ox,oy) = integer world offset of the local origin. */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, hw: number, hh: number, ox: number, oy: number, now: number) {
    const t = this.theme; if (!t) return; this.frame++;
    const x0 = Math.floor((camX - hw - 8) / CHUNK), x1 = Math.floor((camX + hw + 8) / CHUNK);
    const y0 = Math.floor((camY - hh - 8) / CHUNK), y1 = Math.floor((camY + hh + 8) / CHUNK);
    const ocx = Math.round(ox / CHUNK), ocy = Math.round(oy / CHUNK);
    let gen = 0, drawn = 0, pending = 0;
    ctx.save(); ctx.imageSmoothingEnabled = true;
    // base fill so a not-yet-generated chunk never shows a hole
    ctx.fillStyle = rgb(t.stone, 0.8); ctx.fillRect(camX - hw - 10, camY - hh - 10, hw * 2 + 20, hh * 2 + 20);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const ax = cx + ocx, ay = cy + ocy, key = ax + ',' + ay;
      let ch = this.chunks.get(key);
      if (!ch) { if (gen >= GEN_PER_FRAME) { pending++; continue; } ch = this.build(ax, ay, t); this.chunks.set(key, ch); gen++; }
      ch.used = this.frame;
      ctx.drawImage(ch.c, cx * CHUNK, cy * CHUNK, CHUNK + 1, CHUNK + 1); drawn++;
      // live embers / crystal sparkles (deterministic per chunk, animated)
      if (Q.lod < 2 && ch.embers.length) {
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${ch.biome === 'crystal' ? t.crystal : t.ember},1)`;
        const e = ch.embers;
        for (let i = 0; i < e.length; i += 3) { const ph = (e[i + 2] + now * 0.25) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.85; ctx.fillRect(cx * CHUNK + e[i] + Math.sin(now + i) * 6, cy * CHUNK + e[i + 1] - ph * 90, 3, 3); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
    this.stats.drawn = drawn; this.stats.pending = pending; this.stats.generated += gen;
    // LRU unload
    if (this.chunks.size > LRU_MAX) {
      const arr = [...this.chunks.values()].sort((a, b) => a.used - b.used);
      for (let i = 0; i < arr.length - LRU_MAX; i++) { this.chunks.delete(arr[i].key); this.stats.unloaded++; }
    }
    this.stats.live = this.chunks.size;
  }

  private build(ax: number, ay: number, t: WorldTheme): Chunk {
    const S = Math.round(CHUNK * RES); const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d')!; g.scale(RES, RES);
    const seed = t.seed, rnd = mulberry32((ih(ax, ay, seed) * 4294967296) >>> 0);
    const wx = ax * CHUNK, wy = ay * CHUNK;
    const biome = biomeAt(wx + CHUNK / 2, wy + CHUNK / 2, seed);
    const st = t.stone;
    // 1. continuous ground tone (noise in absolute coords -> seamless across chunks)
    const B = 40;
    for (let y = 0; y < CHUNK; y += B) for (let x = 0; x < CHUNK; x += B) {
      const n = vnoise((wx + x) / 380, (wy + y) / 380, seed + 3) * 0.6 + vnoise((wx + x) / 90, (wy + y) / 90, seed + 5) * 0.4;
      const bb = biomeAt(wx + x, wy + y, seed);
      const tint = bb === 'grove' ? [0.78, 0.95, 0.8] : bb === 'ember' ? [1.05, 0.8, 0.72] : bb === 'crystal' ? [0.85, 0.92, 1.12] : [1, 1, 1];
      const k = 0.62 + n * 0.42;
      g.fillStyle = `rgb(${(st[0] * k * tint[0]) | 0},${(st[1] * k * tint[1]) | 0},${(st[2] * k * tint[2]) | 0})`;
      g.fillRect(x, y, B + 1, B + 1);
    }
    // 2. fine grit
    for (let i = 0; i < 220; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.05)'; g.fillRect(rnd() * CHUNK, rnd() * CHUNK, 2 + rnd() * 4, 2 + rnd() * 3); }
    const embers: number[] = [];
    const M = 60, P = () => M + rnd() * (CHUNK - 2 * M); // keep features inside the chunk (no seams)
    if (biome === 'flagstone' || biome === 'ruins') {
      const T = 80; // grid aligned to chunk edges -> seamless
      for (let y = 0; y < CHUNK; y += T) for (let x = 0; x < CHUNK; x += T) {
        if (biome === 'ruins' && rnd() < 0.45) continue;
        const k = 0.78 + rnd() * 0.3; g.fillStyle = rgb(st, k * 1.15); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3;
        const j = () => (rnd() - 0.5) * 6; g.beginPath(); g.moveTo(x + 3 + j(), y + 3 + j()); g.lineTo(x + T - 3 + j(), y + 3 + j()); g.lineTo(x + T - 3 + j(), y + T - 3 + j()); g.lineTo(x + 3 + j(), y + T - 3 + j()); g.closePath(); g.fill(); g.stroke();
        if (rnd() < 0.3) { g.strokeStyle = t.crack; g.lineWidth = 1.5; g.beginPath(); let px = x + rnd() * T, py = y + rnd() * T; g.moveTo(px, py); for (let s = 0; s < 3; s++) { px += (rnd() - 0.5) * 40; py += (rnd() - 0.5) * 40; g.lineTo(px, py); } g.stroke(); }
      }
      if (rnd() < 0.35) { // faint rune inlay
        const x = P(), y = P(), r = 40 + rnd() * 30; g.strokeStyle = `rgba(${t.rune},0.35)`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.stroke();
        for (let s = 0; s < 6; s++) { const a = s * 1.047; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
      }
    }
    if (biome === 'ruins') {
      for (let i = 0; i < 4; i++) { // broken walls / columns
        const x = P(), y = P();
        if (rnd() < 0.5) { const w = 60 + rnd() * 90, h = 18 + rnd() * 12; g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 6, y + 10, w, h); g.fillStyle = rgb(st, 1.45); g.fillRect(x, y, w, h); g.fillStyle = rgb(st, 1.8); g.fillRect(x, y, w, 5); }
        else { const r = 16 + rnd() * 10; g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 6, y + 8, r, r * 0.7, 0, 0, 6.28); g.fill(); g.fillStyle = rgb(st, 1.5); g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill(); g.strokeStyle = rgb(st, 2); g.lineWidth = 3; g.stroke(); }
      }
      for (let i = 0; i < 14; i++) { g.fillStyle = rgb(st, 1.2 + rnd() * 0.4); g.fillRect(P(), P(), 6 + rnd() * 12, 5 + rnd() * 8); }
    }
    if (biome === 'grove') {
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${40 + rnd() * 30 | 0},${80 + rnd() * 50 | 0},${50 + rnd() * 20 | 0},0.35)`; g.beginPath(); g.ellipse(P(), P(), 10 + rnd() * 24, 6 + rnd() * 12, rnd() * 3, 0, 6.28); g.fill(); } // grass tufts
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) { // trees (canopy from above) + bushes
        const x = P(), y = P(), big = rnd() < 0.55, r = big ? 46 + rnd() * 22 : 18 + rnd() * 10;
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x + r * 0.35, y + r * 0.45, r, r * 0.8, 0, 0, 6.28); g.fill();
        for (let k = 0; k < (big ? 6 : 3); k++) { const a = rnd() * 6.28, d = rnd() * r * 0.45, rr = r * (0.5 + rnd() * 0.35); g.fillStyle = `rgb(${22 + rnd() * 20 | 0},${58 + rnd() * 40 | 0},${40 + rnd() * 20 | 0})`; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 6.28); g.fill(); }
        g.fillStyle = 'rgba(190,255,200,0.12)'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.4, 0, 6.28); g.fill();
        if (big && rnd() < 0.6) for (let k = 0; k < 4; k++) embers.push(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r, rnd());
      }
    }
    if (biome === 'crystal') {
      const n = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const x = P(), y = P();
        const gr = g.createRadialGradient(x, y, 0, x, y, 70); gr.addColorStop(0, `rgba(${t.crystal},0.35)`); gr.addColorStop(1, `rgba(${t.crystal},0)`); g.fillStyle = gr; g.fillRect(x - 70, y - 70, 140, 140);
        for (let k = 0; k < 4; k++) { const a = rnd() * 6.28, d = rnd() * 22, h = 22 + rnd() * 34, w = 7 + rnd() * 7, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
          g.fillStyle = `rgba(${t.crystal},0.9)`; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py - h); g.lineTo(px + w, py - h * 0.3); g.lineTo(px, py + 6); g.lineTo(px - w, py - h * 0.3); g.closePath(); g.fill(); g.stroke(); }
        for (let k = 0; k < 3; k++) embers.push(x + (rnd() - 0.5) * 50, y + (rnd() - 0.5) * 30, rnd());
      }
    }
    if (biome === 'ember') {
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++) { let px = P(), py = P(); g.strokeStyle = `rgba(${t.ember},0.75)`; g.lineWidth = 4; g.beginPath(); g.moveTo(px, py); for (let s = 0; s < 4; s++) { px = Math.max(20, Math.min(CHUNK - 20, px + (rnd() - 0.5) * 110)); py = Math.max(20, Math.min(CHUNK - 20, py + (rnd() - 0.5) * 110)); g.lineTo(px, py); } g.stroke(); g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 1.2; g.stroke(); embers.push(px, py, rnd(), px - 30, py + 10, rnd()); }
      for (let i = 0; i < 3; i++) { const x = P(), y = P(); const gr = g.createRadialGradient(x, y, 0, x, y, 50); gr.addColorStop(0, `rgba(${t.ember},0.5)`); gr.addColorStop(1, `rgba(${t.ember},0)`); g.fillStyle = gr; g.fillRect(x - 50, y - 50, 100, 100); }
    }
    // scattered stones everywhere
    for (let i = 0; i < 5; i++) { const x = P(), y = P(), r = 5 + rnd() * 9; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 3, y + 4, r, r * 0.7, 0, 0, 6.28); g.fill(); g.fillStyle = rgb(st, 1.5 + rnd() * 0.4); g.beginPath(); g.ellipse(x, y, r, r * 0.75, rnd() * 3, 0, 6.28); g.fill(); }
    return { key: ax + ',' + ay, cx: ax, cy: ay, c, used: this.frame, biome, embers: new Float32Array(embers) };
  }
}
