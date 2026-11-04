/** Flat 2D cached sprites for the v4 enemy roster + elite aura + enemy shots + spirits. */
import { makeCanvas, drawGlow, tintSilhouette } from './ArtKit';
import { ENEMY_DEFS } from './enemies';

const RES = 2;
interface Spr { c: HTMLCanvasElement; hit: HTMLCanvasElement; frozen: HTMLCanvasElement; s: number }
const cache = new Map<string, Spr>();
type D = (g: CanvasRenderingContext2D, r: number) => void;

const poly = (g: CanvasRenderingContext2D, pts: number[], fill: string, stroke?: string, lw = 1.5) => {
  g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath();
  g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
};
const circ = (g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string, lw = 1.5) => {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
};
const eyes = (g: CanvasRenderingContext2D, y: number, dx: number, r: number, c = '#fff7c2') => { circ(g, -dx, y, r, c); circ(g, dx, y, r, c); };

const DRAW: Record<string, D> = {
  astral_wisp: (g, r) => { poly(g, [0, -r * 1.6, r * 0.9, 0, 0, r * 0.9, -r * 0.9, 0], '#0c4a6e', '#7dd3fc', 2); circ(g, 0, -r * 0.1, r * 0.45, '#e0f2fe'); poly(g, [-r * 0.9, 0, -r * 1.8, -r * 0.7, -r * 1.2, r * 0.3], '#38bdf8'); poly(g, [r * 0.9, 0, r * 1.8, -r * 0.7, r * 1.2, r * 0.3], '#38bdf8'); },
  star_archer: (g, r) => { poly(g, [-r * 0.7, r, 0, -r * 0.6, r * 0.7, r], '#1e1b4b', '#fde68a', 1.6); circ(g, 0, -r * 0.9, r * 0.45, '#312e81', '#fde68a'); eyes(g, -r * 0.92, r * 0.17, r * 0.1, '#fde047');
    g.strokeStyle = '#facc15'; g.lineWidth = 2; g.beginPath(); g.arc(r * 0.7, -r * 0.2, r * 0.9, -1.2, 1.2); g.stroke(); g.lineWidth = 0.8; g.beginPath(); g.moveTo(r * 0.95, -r * 1.05); g.lineTo(r * 0.95, r * 0.65); g.stroke(); },
  ice_golem: (g, r) => { poly(g, [-r * 0.9, r * 0.9, -r, -r * 0.2, -r * 0.5, -r * 0.9, r * 0.5, -r * 0.9, r, -r * 0.2, r * 0.9, r * 0.9], '#164e63', '#bae6fd', 2.2);
    poly(g, [-r * 1.35, -r * 0.4, -r * 0.95, -r * 0.6, -r * 0.95, r * 0.5, -r * 1.4, r * 0.4], '#0e7490', '#a5f3fc'); poly(g, [r * 1.35, -r * 0.4, r * 0.95, -r * 0.6, r * 0.95, r * 0.5, r * 1.4, r * 0.4], '#0e7490', '#a5f3fc');
    poly(g, [-r * 0.3, -r * 0.9, 0, -r * 1.5, r * 0.3, -r * 0.9], '#e0f2fe'); eyes(g, -r * 0.45, r * 0.25, r * 0.1, '#67e8f9'); },
  frost_spitter: (g, r) => { circ(g, 0, 0, r * 0.85, '#155e75', '#67e8f9', 1.8); poly(g, [-r * 0.5, -r * 0.6, -r * 0.2, -r * 1.3, 0, -r * 0.7, r * 0.2, -r * 1.3, r * 0.5, -r * 0.6], '#a5f3fc');
    circ(g, 0, r * 0.15, r * 0.3, '#020617', '#a5f3fc', 1); eyes(g, -r * 0.3, r * 0.3, r * 0.1, '#ecfeff'); },
  magma_bomber: (g, r) => { circ(g, 0, 0, r * 0.95, '#431407', '#fb923c', 2); g.strokeStyle = '#fdba74'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-r * 0.6, -r * 0.2); g.lineTo(0, r * 0.2); g.lineTo(r * 0.5, -r * 0.4); g.moveTo(0, r * 0.2); g.lineTo(r * 0.1, r * 0.8); g.stroke();
    g.strokeStyle = '#78350f'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -r * 0.95); g.quadraticCurveTo(r * 0.4, -r * 1.4, r * 0.2, -r * 1.6); g.stroke(); circ(g, r * 0.2, -r * 1.65, r * 0.18, '#fde047'); },
  fire_imp: (g, r) => { poly(g, [-r * 0.6, r * 0.7, 0, -r * 0.5, r * 0.6, r * 0.7], '#7f1d1d', '#f87171', 1.5); circ(g, 0, -r * 0.6, r * 0.5, '#991b1b', '#fca5a5'); poly(g, [-r * 0.4, -r * 0.9, -r * 0.6, -r * 1.5, -r * 0.1, -r * 1.0], '#fca5a5'); poly(g, [r * 0.4, -r * 0.9, r * 0.6, -r * 1.5, r * 0.1, -r * 1.0], '#fca5a5');
    poly(g, [-r * 0.3, -r * 0.2, -r * 1.7, -r * 0.9, -r * 1.3, r * 0.2], '#b91c1c', '#f87171', 1); poly(g, [r * 0.3, -r * 0.2, r * 1.7, -r * 0.9, r * 1.3, r * 0.2], '#b91c1c', '#f87171', 1); eyes(g, -r * 0.62, r * 0.2, r * 0.1, '#fde047'); },
  lava_charger: (g, r) => { poly(g, [-r * 1.2, r * 0.6, -r * 1.1, -r * 0.3, -r * 0.3, -r * 0.8, r * 0.8, -r * 0.6, r * 1.3, 0, r * 1.1, r * 0.6], '#292524', '#ea580c', 2.2);
    poly(g, [r * 0.8, -r * 0.6, r * 1.6, -r * 1.0, r * 1.1, -r * 0.3], '#fdba74'); poly(g, [-r * 0.3, -r * 0.8, 0, -r * 1.3, r * 0.2, -r * 0.75], '#fb923c'); g.strokeStyle = '#f97316'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-r * 0.8, 0); g.lineTo(-r * 0.2, -r * 0.2); g.lineTo(r * 0.3, r * 0.2); g.stroke(); circ(g, r * 0.95, -r * 0.25, r * 0.12, '#fde047'); },
  crypt_phantom: (g, r) => { g.globalAlpha = 0.85; poly(g, [-r * 0.8, -r * 0.3, -r * 0.5, -r * 1.2, r * 0.5, -r * 1.2, r * 0.8, -r * 0.3, r * 0.8, r * 0.9, r * 0.4, r * 0.5, 0, r * 1.0, -r * 0.4, r * 0.5, -r * 0.8, r * 0.9], '#3b0764', '#d8b4fe', 1.6); g.globalAlpha = 1; poly(g, [-r * 0.45, -r * 0.6, -r * 0.1, -r * 0.55, -r * 0.3, -r * 0.3], '#f5d0fe'); poly(g, [r * 0.45, -r * 0.6, r * 0.1, -r * 0.55, r * 0.3, -r * 0.3], '#f5d0fe'); },
  bone_summoner: (g, r) => { poly(g, [-r * 0.8, r, -r * 0.4, -r * 0.5, r * 0.4, -r * 0.5, r * 0.8, r], '#1c1917', '#a3e635', 1.6); circ(g, 0, -r * 0.85, r * 0.45, '#e7e5e4', '#57534e'); circ(g, -r * 0.16, -r * 0.88, r * 0.11, '#1a2e05'); circ(g, r * 0.16, -r * 0.88, r * 0.11, '#1a2e05');
    g.strokeStyle = '#d6d3d1'; g.lineWidth = 2; g.beginPath(); g.moveTo(-r * 1.0, r); g.lineTo(-r * 1.0, -r * 1.3); g.stroke(); circ(g, -r * 1.0, -r * 1.4, r * 0.22, '#a3e635'); },
  void_ooze: (g, r) => { g.beginPath(); g.moveTo(-r, r * 0.7); g.quadraticCurveTo(-r * 1.1, -r * 0.6, 0, -r * 0.9); g.quadraticCurveTo(r * 1.1, -r * 0.6, r, r * 0.7); g.closePath(); g.fillStyle = '#4c1d95'; g.fill(); g.strokeStyle = '#a78bfa'; g.lineWidth = 2; g.stroke();
    circ(g, -r * 0.3, -r * 0.3, r * 0.2, '#ddd6fe'); circ(g, r * 0.25, -r * 0.1, r * 0.13, '#ddd6fe'); circ(g, r * 0.5, r * 0.35, r * 0.1, '#c4b5fd'); },
  sun_seraph: (g, r) => { for (const s of [-1, 1]) { poly(g, [s * r * 0.3, -r * 0.4, s * r * 1.9, -r * 1.3, s * r * 1.6, -r * 0.4, s * r * 1.9, r * 0.1, s * r * 0.4, r * 0.2], '#fef3c7', '#facc15', 1.2); }
    poly(g, [-r * 0.45, r, 0, -r * 0.5, r * 0.45, r], '#fde68a', '#ca8a04'); circ(g, 0, -r * 0.8, r * 0.38, '#fffbeb', '#ca8a04'); g.strokeStyle = '#facc15'; g.lineWidth = 1.8; g.beginPath(); g.ellipse(0, -r * 1.35, r * 0.45, r * 0.12, 0, 0, Math.PI * 2); g.stroke(); },
  radiant_sentinel: (g, r) => { poly(g, [-r * 0.6, r, -r * 0.7, -r * 0.6, 0, -r * 1.3, r * 0.7, -r * 0.6, r * 0.6, r], '#78350f', '#fcd34d', 2); poly(g, [-r * 1.3, -r * 0.7, -r * 0.5, -r * 0.8, -r * 0.5, r * 0.6, -r * 0.9, r * 0.9, -r * 1.3, r * 0.6], '#fde68a', '#b45309', 1.8);
    circ(g, -r * 0.9, -r * 0.05, r * 0.2, '#fff7ed'); g.strokeStyle = '#fef3c7'; g.lineWidth = 2; g.beginPath(); g.moveTo(r * 0.9, r * 0.9); g.lineTo(r * 0.9, -r * 1.5); g.stroke(); poly(g, [r * 0.9, -r * 1.9, r * 1.1, -r * 1.5, r * 0.7, -r * 1.5], '#fde047'); eyes(g, -r * 0.65, r * 0.2, r * 0.09, '#fde047'); },
};

function sprite(type: string, small: boolean): Spr {
  const key = type + (small ? 's' : '');
  let s = cache.get(key); if (s) return s;
  const def = ENEMY_DEFS[type]; const r = def.r * (small ? 0.6 : 1);
  const S = r * 4.4;
  const [c, g] = makeCanvas(Math.ceil(S * RES), Math.ceil(S * RES));
  g.scale(RES, RES); g.translate(S / 2, S / 2); g.lineJoin = 'round'; g.lineCap = 'round';
  (DRAW[type] ?? DRAW.void_ooze)(g, r);
  s = { c, hit: tintSilhouette(c, 'rgba(255,240,230,0.9)'), frozen: tintSilhouette(c, 'rgba(120,200,255,0.55)'), s: S };
  cache.set(key, s); return s;
}
export const hasNewArt = (t: string) => !!DRAW[t];

export interface EnemyLike { x: number; y: number; type: string; radius: number; hp: number; maxHp: number; flying?: boolean; elite?: boolean; small?: boolean; state?: number; ai?: number; dx?: number; dy?: number }
export function renderNewEnemy(ctx: CanvasRenderingContext2D, e: EnemyLike, isFrozen: boolean, isHit: boolean, facing: number, phase: number, auraColor?: string) {
  const def = ENEMY_DEFS[e.type]; const t = performance.now() * 0.001;
  const spr = sprite(e.type, !!e.small);
  const r = e.radius; const sc = e.elite ? 1.25 : 1;
  const hover = e.flying ? 26 + Math.sin(t * 4 + phase) * 5 : 0;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.flying) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, r * 0.6, r * 0.8, r * 0.28, 0, 0, Math.PI * 2); ctx.fill(); }
  // charger telegraph
  if (e.type === 'lava_charger' && e.state === 1 && e.dx !== undefined) {
    ctx.strokeStyle = `rgba(255,90,20,${0.4 + 0.4 * Math.sin(t * 30)})`; ctx.lineWidth = r * 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((e.dx ?? 0) * 420, (e.dy ?? 0) * 420); ctx.stroke();
  }
  if (e.type === 'magma_bomber' && e.state === 1) { ctx.strokeStyle = 'rgba(255,120,40,0.85)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  ctx.globalCompositeOperation = 'lighter';
  if (e.elite) drawGlow(ctx, auraColor ?? '#facc15', 0, -hover, r * 3.4, 0.55 + 0.15 * Math.sin(t * 6));
  drawGlow(ctx, def.glow, 0, -hover, r * 2.2, 0.3);
  if (e.type === 'magma_bomber' && e.state === 1) drawGlow(ctx, '#fff', 0, 0, r * 2.5, 0.5 + 0.5 * Math.sin(t * 40));
  ctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(0, -hover - (e.flying ? 0 : r * 0.1));
  const bob = e.flying ? 0 : Math.sin(t * 9 + phase) * 0.04;
  ctx.scale(facing * sc * (1 + bob), sc * (1 - bob));
  const k = spr.s;
  ctx.drawImage(spr.c, -k / 2, -k / 2, k, k);
  if (isFrozen) ctx.drawImage(spr.frozen, -k / 2, -k / 2, k, k);
  if (isHit) ctx.drawImage(spr.hit, -k / 2, -k / 2, k, k);
  ctx.restore();
  if (e.elite) { ctx.strokeStyle = auraColor ?? '#facc15'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, r * 0.7, r * 1.4, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (e.hp < e.maxHp || e.elite) {
    const bw = r * (e.elite ? 2.6 : 1.8); const y = -hover - r * 2.1 * sc;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-bw / 2 - 1, y - 1, bw + 2, 4);
    ctx.fillStyle = e.elite ? '#facc15' : '#ef4444'; ctx.fillRect(-bw / 2, y, bw * Math.max(0, e.hp / e.maxHp), 2);
  }
  ctx.restore();
}

/** Wings/aura for any enemy elite of an old type (drawn under the old sprite). */
export function renderEliteAura(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const t = performance.now() * 0.001;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, color, x, y - r * 0.3, r * 3.4, 0.55 + 0.15 * Math.sin(t * 6)); ctx.restore();
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 1.4, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

export interface ShotLike { x: number; y: number; vx: number; vy: number; color: string; ground: boolean; r: number }
export function renderShot(ctx: CanvasRenderingContext2D, s: ShotLike) {
  const z = s.ground ? 0 : 22;
  ctx.save();
  if (s.ground) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, s.r, s.r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalCompositeOperation = 'lighter';
  const l = Math.hypot(s.vx, s.vy) || 1;
  ctx.strokeStyle = s.color; ctx.globalAlpha = 0.6; ctx.lineWidth = s.r; ctx.beginPath(); ctx.moveTo(s.x, s.y - z); ctx.lineTo(s.x - (s.vx / l) * 26, s.y - z - (s.vy / l) * 26); ctx.stroke();
  ctx.globalAlpha = 1;
  drawGlow(ctx, s.color, s.x, s.y - z, s.r * 3, 0.9);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y - z, s.r * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

let spiritSpr: HTMLCanvasElement | null = null;
export function renderSpirit(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, phase: number, dashing: boolean) {
  if (!spiritSpr) {
    const [c, g] = makeCanvas(40 * RES, 40 * RES); g.scale(RES, RES); g.translate(20, 20);
    g.beginPath(); g.moveTo(-8, 10); g.lineTo(-8, -2); g.arc(0, -2, 8, Math.PI, 0); g.lineTo(8, 10); g.lineTo(5, 7); g.lineTo(2, 10); g.lineTo(-1, 7); g.lineTo(-4, 10); g.closePath();
    g.fillStyle = 'rgba(153,246,228,0.9)'; g.fill(); g.strokeStyle = '#f0fdfa'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#134e4a'; g.beginPath(); g.arc(-3, -2, 1.6, 0, Math.PI * 2); g.arc(3, -2, 1.6, 0, Math.PI * 2); g.fill();
    spiritSpr = c;
  }
  const t = performance.now() * 0.001; const bob = Math.sin(t * 5 + phase) * 3;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 6, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, '#2dd4bf', 0, -z - 18 + bob, dashing ? 34 : 24, dashing ? 0.9 : 0.6); ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(spiritSpr, -14, -z - 32 + bob, 28, 28);
  ctx.restore();
}

/** Flat 2D flapping wings drawn behind a flying hero. */
export function renderFlightWings(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, color: string) {
  if (k <= 0.02) return;
  const t = performance.now() * 0.001; const flap = Math.sin(t * 9) * 0.35;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.min(1, k * 1.2);
  ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, color, 0, 0, 70, 0.35 * k);
  for (const s of [-1, 1]) {
    ctx.save(); ctx.scale(s, 1); ctx.rotate(-0.25 + flap);
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(30, -38, 62, -30); ctx.lineTo(50, -18); ctx.lineTo(58, -8); ctx.lineTo(42, -2); ctx.lineTo(48, 8); ctx.quadraticCurveTo(22, 6, 4, 6); ctx.closePath();
    ctx.fillStyle = color; ctx.globalAlpha = 0.45 * k; ctx.fill(); ctx.globalAlpha = 0.9 * k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
