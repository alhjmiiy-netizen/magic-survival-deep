/** v5 Cataclysm scenes + beyond-the-circle world rendering. Pure render helpers + data. */
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
    kind: 'sky', name: 'Sky Realm', title: 'THE SKY SHATTERS', sub: 'The circle falls away — storm-borne flyers rule here', color: '#7dd3fc',
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

const hazeCache = new Map<string, CanvasGradient>();
const bgCache = new Map<string, CanvasGradient>();
const hash = (x: number, y: number, s = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };

/** Beyond-the-circle world for normal regions: drifting cloud banks + floating rock islands tinted by region colour. */
export function renderBeyond(ctx: CanvasRenderingContext2D, color: string, camX: number, camY: number, hw: number, hh: number, arenaR: number, worldR: number, now: number, kind?: SceneKind) {
  const cell = 460;
  const x0 = Math.floor((camX - hw) / cell) - 1, x1 = Math.floor((camX + hw) / cell) + 1;
  const y0 = Math.floor((camY - hh) / cell) - 1, y1 = Math.floor((camY + hh) / cell) + 1;
  ctx.save();
  // tinted haze so far space never reads as flat black
  const gk = color + arenaR + '|' + worldR; let g = hazeCache.get(gk);
  if (!g) { g = ctx.createRadialGradient(0, 0, arenaR * 0.9, 0, 0, worldR * 1.05); g.addColorStop(0, hexA(color, 0.20)); g.addColorStop(0.6, hexA(color, 0.10)); g.addColorStop(1, 'rgba(10,12,24,0.35)'); if (hazeCache.size > 24) hazeCache.clear(); hazeCache.set(gk, g); }
  ctx.fillStyle = g; ctx.fillRect(camX - hw - 50, camY - hh - 50, hw * 2 + 100, hh * 2 + 100);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const r1 = hash(cx, cy), r2 = hash(cx, cy, 1), r3 = hash(cx, cy, 2);
    const wx = cx * cell + r1 * cell, wy = cy * cell + r2 * cell;
    const d = Math.hypot(wx, wy);
    if (d < arenaR + 140 || d > worldR + 200) continue;
    if (r3 < 0.45) {
      // floating island
      const s = 50 + r1 * 90; const bob = Math.sin(now * 0.6 + r2 * 6) * 6;
      ctx.fillStyle = kind === 'abyss' ? '#1a0d0a' : 'rgba(20,24,40,0.95)';
      ctx.beginPath(); ctx.moveTo(wx - s, wy + bob); ctx.lineTo(wx - s * 0.3, wy + bob + s * 0.9); ctx.lineTo(wx + s * 0.2, wy + bob + s * 0.6); ctx.lineTo(wx + s, wy + bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = kind === 'abyss' ? '#3b1d14' : hexA(color, 0.55);
      ctx.beginPath(); ctx.ellipse(wx, wy + bob, s, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = kind === 'abyss' ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.ellipse(wx - s * 0.2, wy + bob - s * 0.06, s * 0.6, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    } else if (r3 < 0.85) {
      // cloud bank
      const s = 80 + r2 * 140; const drift = ((now * 12 + r1 * 400) % 400) - 200;
      ctx.fillStyle = kind === 'abyss' ? 'rgba(90,20,10,0.25)' : `rgba(220,230,255,${0.08 + r1 * 0.08})`;
      const nk = Q.lod >= 2 ? 2 : 4; for (let k = 0; k < nk; k++) { ctx.beginPath(); ctx.ellipse(wx + drift * 0.2 + (k - 1.5) * s * 0.45, wy + Math.sin(k * 2.1) * s * 0.12, s * 0.42, s * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
    } else {
      // star / ember sparkle
      ctx.fillStyle = kind === 'abyss' ? 'rgba(251,146,60,0.8)' : 'rgba(255,255,255,0.7)';
      const tw = 1.5 + Math.sin(now * 3 + r1 * 9) * 1;
      ctx.beginPath(); ctx.arc(wx, wy, tw, 0, Math.PI * 2); ctx.fill();
    }
  }
  // soft world edge: thick fog wall (only when the edge is actually on screen)
  const camD = Math.hypot(camX, camY), diag = Math.hypot(hw, hh);
  if (camD + diag > worldR - 200) {
  ctx.lineWidth = 260; ctx.strokeStyle = 'rgba(200,210,255,0.10)';
  ctx.beginPath(); ctx.arc(0, 0, worldR + 60, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 8; ctx.strokeStyle = hexA(color, 0.35 + 0.15 * Math.sin(now * 2)); ctx.setLineDash([30, 26]);
  ctx.beginPath(); ctx.arc(0, 0, worldR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

export function hexA(hex: string, a: number) {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const floorCache: Partial<Record<SceneKind, HTMLCanvasElement>> = {};
function sceneFloor(kind: SceneKind, R: number) {
  const c0 = floorCache[kind]; if (c0) return c0;
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d')!; const d = SCENES[kind]; const k = S / (2 * R);
  x.translate(S / 2, S / 2); x.scale(k, k);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, d.floor[0]); g.addColorStop(1, d.floor[1]);
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2); x.fill();
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  if (kind === 'abyss') {
    // basalt plates with lava fissures
    x.strokeStyle = 'rgba(249,115,22,0.85)'; x.lineWidth = 6; x.shadowColor = '#f97316'; x.shadowBlur = 20;
    for (let i = 0; i < 26; i++) { let px = (rnd() - 0.5) * R * 1.6, py = (rnd() - 0.5) * R * 1.6; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (rnd() - 0.5) * 220; py += (rnd() - 0.5) * 220; x.lineTo(px, py); } x.stroke(); }
    x.shadowBlur = 0;
    for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, r = rnd() * R * 0.75; const pg = x.createRadialGradient(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * r, Math.sin(a) * r, 90); pg.addColorStop(0, 'rgba(255,170,60,0.9)'); pg.addColorStop(1, 'rgba(120,20,0,0)'); x.fillStyle = pg; x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, 90, 0, 6.28); x.fill(); }
    x.strokeStyle = '#000'; x.lineWidth = 40; x.beginPath(); x.arc(0, 0, R - 20, 0, 6.28); x.stroke();
  } else if (kind === 'sky') {
    // floating island top: grass/stone patches, cloud rim
    for (let i = 0; i < 90; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * R * 0.92; x.fillStyle = rnd() < 0.5 ? 'rgba(120,140,170,0.35)' : 'rgba(90,150,130,0.28)'; x.beginPath(); x.ellipse(Math.cos(a) * r, Math.sin(a) * r, 30 + rnd() * 70, 14 + rnd() * 30, rnd() * 3, 0, 6.28); x.fill(); }
    x.strokeStyle = 'rgba(230,240,255,0.5)'; x.lineWidth = 50; x.beginPath(); x.arc(0, 0, R - 25, 0, 6.28); x.stroke();
    x.strokeStyle = 'rgba(230,240,255,0.25)'; x.lineWidth = 6; for (let r = 200; r < R; r += 220) { x.beginPath(); x.arc(0, 0, r, 0, 6.28); x.stroke(); }
  } else {
    // astral rift: star dust, violet runic rings, tears
    for (let i = 0; i < 400; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * R; x.fillStyle = `rgba(240,171,252,${0.2 + rnd() * 0.6})`; x.fillRect(Math.cos(a) * r, Math.sin(a) * r, 3, 3); }
    x.strokeStyle = 'rgba(192,132,252,0.5)'; x.lineWidth = 5; for (const r of [260, 520, R - 40]) { x.setLineDash([40, 24]); x.beginPath(); x.arc(0, 0, r, 0, 6.28); x.stroke(); }
    x.setLineDash([]); x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 4; x.shadowColor = '#e879f9'; x.shadowBlur = 18;
    for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, r = 150 + rnd() * R * 0.7; x.beginPath(); x.moveTo(Math.cos(a) * r, Math.sin(a) * r); x.lineTo(Math.cos(a + 0.12) * (r + 60), Math.sin(a + 0.12) * (r + 60)); x.stroke(); }
  }
  floorCache[kind] = c; return c;
}

/** Full scene backdrop + floor + animated overlay (world space; caller has camera transform applied). */
export function renderScene(ctx: CanvasRenderingContext2D, kind: SceneKind, R: number, camX: number, camY: number, hw: number, hh: number, worldR: number, now: number, alpha = 1) {
  const d = SCENES[kind];
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const bk = kind + ch; let g = bgCache.get(bk); if (!g) { g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, d.bg[0]); g.addColorStop(0.55, d.bg[1]); g.addColorStop(1, d.bg[2]); bgCache.set(bk, g); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  if (kind === 'sky' && Math.sin(now * 1.7) > 0.985) { ctx.fillStyle = 'rgba(220,235,255,0.35)'; ctx.fillRect(0, 0, cw, ch); }
  ctx.restore();
  renderBeyond(ctx, d.color, camX, camY, hw, hh, R, worldR, now, kind);
  if (kind === 'sky') {
    // underside of the floating island
    ctx.fillStyle = '#1f2638'; ctx.beginPath(); ctx.moveTo(-R, 0); ctx.quadraticCurveTo(-R * 0.4, R * 1.5, 0, R * 1.7); ctx.quadraticCurveTo(R * 0.4, R * 1.5, R, 0); ctx.fill();
  }
  ctx.drawImage(sceneFloor(kind, R), -R, -R, R * 2, R * 2);
  // animated overlay
  ctx.globalCompositeOperation = 'lighter';
  if (kind === 'abyss') { ctx.fillStyle = `rgba(249,115,22,${0.05 + 0.04 * Math.sin(now * 2)})`; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.28); ctx.fill(); }
  if (kind === 'rift') for (let i = 0; i < 14; i++) { const a = now * 0.15 + i * 0.45, r = R * (0.3 + (i % 5) * 0.15); const px = Math.cos(a) * r, py = Math.sin(a) * r; ctx.fillStyle = 'rgba(192,132,252,0.35)'; ctx.save(); ctx.translate(px, py); ctx.rotate(now + i); ctx.fillRect(-14, -9, 28, 18); ctx.restore(); }
  if (kind === 'sky') for (let i = 0; i < 3; i++) { const t = (now * 0.4 + i * 0.33) % 1; if (t < 0.04) { const a = i * 2.1 + Math.floor(now * 0.4) ; const px = Math.cos(a) * R * 0.6, py = Math.sin(a) * R * 0.6; ctx.strokeStyle = 'rgba(253,224,71,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px, py - 600); for (let s = 1; s <= 6; s++) ctx.lineTo(px + (hash(s, i, Math.floor(now)) - 0.5) * 80, py - 600 + s * 100); ctx.stroke(); } }
  ctx.restore();
}

/** Fracture lines (generated once per cataclysm). */
export function makeCracks(R: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2 + Math.random() * 0.3; const pts: number[] = [0, 0];
    let r = 0, a = a0;
    while (r < R) { r += 70 + Math.random() * 80; a += (Math.random() - 0.5) * 0.35; pts.push(Math.cos(a) * Math.min(r, R), Math.sin(a) * Math.min(r, R)); }
    out.push(pts);
    // rim cracks
    const ra = Math.random() * 6.28; out.push([Math.cos(ra) * R, Math.sin(ra) * R, Math.cos(ra + 0.05) * (R - 160), Math.sin(ra + 0.05) * (R - 160), Math.cos(ra - 0.04) * (R - 280), Math.sin(ra - 0.04) * (R - 280)]);
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
