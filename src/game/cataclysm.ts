/** v5 Cataclysm scenes + endless scene rendering. Pure render helpers + data. */
import type { Enemy } from '../types/game';
import { Q } from './ArtKit';

export type SceneKind = 'sky' | 'abyss' | 'rift';
export interface SceneDef {
  kind: SceneKind; name: string; title: string; sub: string; color: string;
  bg: [string, string, string]; floor: [string, string]; accent: string;
  roster: [Enemy['type'], number][];
  hazard: { name: string; every: number; radius: number; dmg: number; color: string; slow?: boolean; air?: boolean };
  spawn: number;
}
export const SCENES: Record<SceneKind, SceneDef> = {
  sky: {
    kind: 'sky', name: 'Sky Realm', title: 'THE SKY SHATTERS', sub: 'The ground falls away — storm-borne flyers rule here', color: '#7dd3fc',
    bg: ['#060b1f', '#1b2f57', '#4d6b96'], floor: ['#56607a', '#2f3850'], accent: '#e0f2fe',
    roster: [['astral_wisp', 0.3], ['fire_imp', 0.2], ['sun_seraph', 0.2], ['crypt_phantom', 0.2], ['star_archer', 0.1]],
    hazard: { name: 'LIGHTNING', every: 2.2, radius: 95, dmg: 70, color: '253,224,71', air: true }, spawn: 0.55,
  },
  abyss: {
    kind: 'abyss', name: 'The Abyss', title: 'THE GROUND GIVES WAY', sub: 'Lava and void-rifts — the hordes of the underworld', color: '#f97316',
    bg: ['#050101', '#2a0804', '#5a1406'], floor: ['#2b1d1a', '#120a09'], accent: '#fb923c',
    roster: [['lava_charger', 0.22], ['hellhound', 0.2], ['crawler', 0.2], ['magma_bomber', 0.14], ['void_ooze', 0.12], ['bone_summoner', 0.12]],
    hazard: { name: 'LAVA ERUPTION', every: 2.6, radius: 115, dmg: 90, color: '249,115,22' }, spawn: 0.45,
  },
  rift: {
    kind: 'rift', name: 'Rift Between', title: 'THE RIFT OPENS', sub: 'Twilight between worlds — beware the Rift Sovereign', color: '#c084fc',
    bg: ['#07031a', '#2a0f4a', '#6b2f7a'], floor: ['#2a2140', '#120d22'], accent: '#f0abfc',
    roster: [['shadow_fiend', 0.2], ['astral_wisp', 0.2], ['void_ooze', 0.15], ['radiant_sentinel', 0.15], ['frost_spitter', 0.15], ['crypt_phantom', 0.15]],
    hazard: { name: 'VOID TEAR', every: 3, radius: 100, dmg: 80, color: '192,132,252', air: true }, spawn: 0.5,
  },
};

const bgCache = new Map<string, CanvasGradient>();
const hash = (x: number, y: number, s = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };

/** v7: scene "sky" parallax: drifting cloud banks / islands in world cells around the camera (endless). */
function renderSceneDeco(ctx: CanvasRenderingContext2D, kind: SceneKind, camX: number, camY: number, hw: number, hh: number, now: number) {
  const cell = 460, color = SCENES[kind].color;
  const x0 = Math.floor((camX - hw) / cell) - 1, x1 = Math.floor((camX + hw) / cell) + 1;
  const y0 = Math.floor((camY - hh) / cell) - 1, y1 = Math.floor((camY + hh) / cell) + 1;
  ctx.save();
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const r1 = hash(cx, cy), r2 = hash(cx, cy, 1), r3 = hash(cx, cy, 2);
    const wx = cx * cell + r1 * cell, wy = cy * cell + r2 * cell;
    if (r3 < 0.25) {
      const s = 50 + r1 * 90; const bob = Math.sin(now * 0.6 + r2 * 6) * 6;
      ctx.fillStyle = kind === 'abyss' ? '#1a0d0a' : 'rgba(20,24,40,0.9)';
      ctx.beginPath(); ctx.moveTo(wx - s, wy + bob); ctx.lineTo(wx - s * 0.3, wy + bob + s * 0.9); ctx.lineTo(wx + s * 0.2, wy + bob + s * 0.6); ctx.lineTo(wx + s, wy + bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = kind === 'abyss' ? '#3b1d14' : hexA(color, 0.5);
      ctx.beginPath(); ctx.ellipse(wx, wy + bob, s, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    } else if (r3 < 0.6 && kind !== 'abyss') {
      const s = 80 + r2 * 140; const drift = ((now * 12 + r1 * 400) % 400) - 200;
      ctx.fillStyle = `rgba(220,230,255,${0.06 + r1 * 0.07})`;
      const nk = Q.lod >= 2 ? 2 : 4; for (let k = 0; k < nk; k++) { ctx.beginPath(); ctx.ellipse(wx + drift * 0.2 + (k - 1.5) * s * 0.45, wy + Math.sin(k * 2.1) * s * 0.12, s * 0.42, s * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
    } else if (r3 > 0.8) {
      ctx.fillStyle = kind === 'abyss' ? 'rgba(251,146,60,0.8)' : 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(wx, wy, 1.5 + Math.sin(now * 3 + r1 * 9), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
/** kept for API compatibility (v5 tests import it); v7 has no world edge so it only draws scene decoration. */
export function renderBeyond(ctx: CanvasRenderingContext2D, _color: string, camX: number, camY: number, hw: number, hh: number, _a: number, _w: number, now: number, kind: SceneKind = 'sky') { renderSceneDeco(ctx, kind, camX, camY, hw, hh, now); }

export function hexA(hex: string, a: number) {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const TILE = 640;
const floorCache: Partial<Record<SceneKind, HTMLCanvasElement>> = {};
const patCache = new Map<string, CanvasPattern>();
/** Seamless tile (features wrapped across edges) so a scene floor covers an endless world. */
function sceneTile(kind: SceneKind) {
  const c0 = floorCache[kind]; if (c0) return c0;
  const S = TILE, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d')!; const d = SCENES[kind];
  x.fillStyle = d.floor[1]; x.fillRect(0, 0, S, S);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const wrap = (f: (ox: number, oy: number) => void) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) f(ox, oy); };
  for (let i = 0; i < 40; i++) { const px = rnd() * S, py = rnd() * S, r = 40 + rnd() * 90; const col = d.floor[0]; wrap((ox, oy) => { const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r); g.addColorStop(0, hexA(col, 0.55)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2); }); }
  if (kind === 'abyss') {
    x.lineWidth = 6; x.shadowColor = '#f97316'; x.shadowBlur = 16; x.strokeStyle = 'rgba(249,115,22,0.85)';
    for (let i = 0; i < 9; i++) { const pts: number[] = []; let px = rnd() * S, py = rnd() * S; pts.push(px, py); for (let j = 0; j < 5; j++) { px += (rnd() - 0.5) * 200; py += (rnd() - 0.5) * 200; pts.push(px, py); }
      wrap((ox, oy) => { x.beginPath(); x.moveTo(pts[0] + ox, pts[1] + oy); for (let k = 2; k < pts.length; k += 2) x.lineTo(pts[k] + ox, pts[k + 1] + oy); x.stroke(); }); }
    x.shadowBlur = 0;
    for (let i = 0; i < 3; i++) { const px = rnd() * S, py = rnd() * S; wrap((ox, oy) => { const pg = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, 80); pg.addColorStop(0, 'rgba(255,170,60,0.85)'); pg.addColorStop(1, 'rgba(120,20,0,0)'); x.fillStyle = pg; x.fillRect(px + ox - 80, py + oy - 80, 160, 160); }); }
  } else if (kind === 'sky') {
    for (let i = 0; i < 40; i++) { const px = rnd() * S, py = rnd() * S, w = 30 + rnd() * 70, h = 14 + rnd() * 30, a = rnd() * 3, col = rnd() < 0.5 ? 'rgba(120,140,170,0.35)' : 'rgba(90,150,130,0.28)'; wrap((ox, oy) => { x.fillStyle = col; x.beginPath(); x.ellipse(px + ox, py + oy, w, h, a, 0, 6.28); x.fill(); }); }
  } else {
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(240,171,252,${0.2 + rnd() * 0.6})`; x.fillRect(rnd() * S, rnd() * S, 3, 3); }
    x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 4; x.shadowColor = '#e879f9'; x.shadowBlur = 14;
    for (let i = 0; i < 6; i++) { const px = rnd() * S, py = rnd() * S, a = rnd() * 6.28; wrap((ox, oy) => { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + Math.cos(a) * 60, py + oy + Math.sin(a) * 60); x.stroke(); }); }
  }
  floorCache[kind] = c; return c;
}

/** Full scene: screen gradient + endless tiled floor + animated overlay around the camera (world transform applied). */
export function renderScene(ctx: CanvasRenderingContext2D, kind: SceneKind, cx: number, cy: number, camX: number, camY: number, hw: number, hh: number, now: number, alpha = 1) {
  const d = SCENES[kind];
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const bk = kind + ch; let g = bgCache.get(bk); if (!g) { g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, d.bg[0]); g.addColorStop(0.55, d.bg[1]); g.addColorStop(1, d.bg[2]); bgCache.set(bk, g); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  if (kind === 'sky' && Math.sin(now * 1.7) > 0.985) { ctx.fillStyle = 'rgba(220,235,255,0.35)'; ctx.fillRect(0, 0, cw, ch); }
  ctx.restore();
  let pat = patCache.get(kind); if (!pat) { pat = ctx.createPattern(sceneTile(kind), 'repeat')!; patCache.set(kind, pat); }
  ctx.globalAlpha = alpha * (kind === 'sky' ? 0.75 : 0.95);
  ctx.fillStyle = pat; ctx.fillRect(camX - hw - 20, camY - hh - 20, hw * 2 + 40, hh * 2 + 40);
  ctx.globalAlpha = alpha;
  renderSceneDeco(ctx, kind, camX, camY, hw, hh, now);
  ctx.globalCompositeOperation = 'lighter';
  if (kind === 'abyss') { ctx.fillStyle = `rgba(249,115,22,${0.04 + 0.04 * Math.sin(now * 2)})`; ctx.fillRect(camX - hw, camY - hh, hw * 2, hh * 2); }
  if (kind === 'rift') for (let i = 0; i < 14; i++) { const a = now * 0.15 + i * 0.45, r = 260 + (i % 5) * 140; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; ctx.fillStyle = 'rgba(192,132,252,0.35)'; ctx.save(); ctx.translate(px, py); ctx.rotate(now + i); ctx.fillRect(-14, -9, 28, 18); ctx.restore(); }
  if (kind === 'sky') for (let i = 0; i < 3; i++) { const t = (now * 0.4 + i * 0.33) % 1; if (t < 0.04) { const a = i * 2.1 + Math.floor(now * 0.4); const px = camX + Math.cos(a) * hw * 0.6, py = camY + Math.sin(a) * hh * 0.6; ctx.strokeStyle = 'rgba(253,224,71,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px, py - 600); for (let s = 1; s <= 6; s++) ctx.lineTo(px + (hash(s, i, Math.floor(now)) - 0.5) * 80, py - 600 + s * 100); ctx.stroke(); } }
  ctx.restore();
}

/** Fracture lines radiating from (cx,cy) — "the ground shatters" around the player (generated once per cataclysm). */
export function makeCracks(R: number, cx = 0, cy = 0): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2 + Math.random() * 0.3; const pts: number[] = [cx, cy];
    let r = 0, a = a0;
    while (r < R) { r += 70 + Math.random() * 80; a += (Math.random() - 0.5) * 0.35; pts.push(cx + Math.cos(a) * Math.min(r, R), cy + Math.sin(a) * Math.min(r, R)); }
    out.push(pts);
    const ra = Math.random() * 6.28, rr = R * (0.4 + Math.random() * 0.5);
    out.push([cx + Math.cos(ra) * rr, cy + Math.sin(ra) * rr, cx + Math.cos(ra + 0.2) * (rr - 120), cy + Math.sin(ra + 0.2) * (rr - 120), cx + Math.cos(ra - 0.1) * (rr - 220), cy + Math.sin(ra - 0.1) * (rr - 220)]);
  }
  return out;
}
export function renderCracks(ctx: CanvasRenderingContext2D, cracks: number[][], k: number, color: string) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of cracks) {
    const n = Math.max(2, Math.floor((p.length / 2) * Math.min(1, k * 1.4)));
    ctx.strokeStyle = color; ctx.lineWidth = 10 * k + 2; ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 1; i < n; i++) ctx.lineTo(p[i * 2], p[i * 2 + 1]); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 + 2 * k; ctx.globalAlpha = 0.9; ctx.stroke();
  }
  ctx.restore();
}
