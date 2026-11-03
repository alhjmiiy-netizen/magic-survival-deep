/**
 * Canvas sprite renderer for Magic Survival.
 * All characters are drawn ONCE into offscreen sprite canvases (no shadowBlur — it is
 * extremely slow on software GL / low-end phones); per frame we only blit sprites,
 * add cheap additive glow sprites and a few animated strokes.
 */
import { EnemyType, Projectile } from '../types/game';
import { makeCanvas, drawGlow, tintSilhouette, glowStroke } from './ArtKit';

const RES = 2; // sprite supersampling

interface Sprite {
  c: HTMLCanvasElement;
  hit: HTMLCanvasElement;
  frozen: HTMLCanvasElement;
  ox: number; // origin in world units inside sprite
  oy: number;
  w: number; // world size
  h: number;
}

function makeSprite(w: number, h: number, ox: number, oy: number, draw: (g: CanvasRenderingContext2D) => void): Sprite {
  const [c, g] = makeCanvas(w * RES, h * RES);
  g.scale(RES, RES);
  g.translate(ox, oy);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  draw(g);
  return { c, hit: tintSilhouette(c, 'rgba(255,240,230,0.9)'), frozen: tintSilhouette(c, 'rgba(120,200,255,0.55)'), ox, oy, w, h };
}

function blit(ctx: CanvasRenderingContext2D, s: Sprite, img: HTMLCanvasElement = s.c) {
  ctx.drawImage(img, -s.ox, -s.oy, s.w, s.h);
}

function crack(g: CanvasRenderingContext2D, pts: number[], hot = '#ff7a1f', core = '#ffd27a', w = 1.4) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  glowStroke(g, hot, core, w);
}

function charcoal(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, '#3a2f31');
  gr.addColorStop(0.5, '#1a1416');
  gr.addColorStop(1, '#070506');
  return gr;
}

function shadow(g: CanvasRenderingContext2D, y: number, rx: number) {
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.beginPath();
  g.ellipse(0, y, rx, rx * 0.32, 0, 0, Math.PI * 2);
  g.fill();
}

// ---------------- Demons ----------------
function drawFiend(g: CanvasRenderingContext2D, r: number) {
  shadow(g, r * 1.15, r * 1.1);
  g.fillStyle = '#0b0809';
  // legs
  g.beginPath();
  g.moveTo(-0.45 * r, 0.1 * r); g.lineTo(-0.75 * r, 1.15 * r); g.lineTo(-0.35 * r, 1.15 * r); g.lineTo(-0.05 * r, 0.25 * r);
  g.moveTo(0.45 * r, 0.1 * r); g.lineTo(0.7 * r, 1.15 * r); g.lineTo(0.3 * r, 1.15 * r); g.lineTo(0.05 * r, 0.25 * r);
  g.fill();
  // arms
  g.strokeStyle = '#140e10';
  g.lineWidth = 0.34 * r;
  g.beginPath();
  g.moveTo(-0.8 * r, -0.75 * r); g.quadraticCurveTo(-1.35 * r, -0.1 * r, -1.15 * r, 0.6 * r);
  g.moveTo(0.8 * r, -0.75 * r); g.quadraticCurveTo(1.35 * r, -0.1 * r, 1.15 * r, 0.6 * r);
  g.stroke();
  g.strokeStyle = '#0a0607';
  g.lineWidth = 0.08 * r;
  for (const sx of [-1, 1]) for (let k = -1; k <= 1; k++) {
    g.beginPath(); g.moveTo(sx * 1.15 * r, 0.6 * r); g.lineTo(sx * (1.15 + 0.1 * k) * r, 0.85 * r); g.stroke();
  }
  // torso (hunched)
  g.fillStyle = charcoal(g, -r, -r, r, r * 0.4);
  g.beginPath();
  g.moveTo(-0.95 * r, -0.85 * r);
  g.quadraticCurveTo(0, -1.25 * r, 0.95 * r, -0.85 * r);
  g.lineTo(0.55 * r, 0.35 * r);
  g.lineTo(-0.55 * r, 0.35 * r);
  g.closePath();
  g.fill();
  // back spikes
  g.fillStyle = '#0d0909';
  for (let i = -2; i <= 2; i++) {
    g.beginPath(); g.moveTo(i * 0.3 * r - 0.1 * r, -0.95 * r); g.lineTo(i * 0.38 * r, -1.35 * r - Math.abs(i) * -0.05 * r); g.lineTo(i * 0.3 * r + 0.1 * r, -0.95 * r); g.fill();
  }
  // head + horns
  g.fillStyle = '#120c0d';
  g.beginPath(); g.ellipse(0.1 * r, -1.15 * r, 0.36 * r, 0.32 * r, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a1d1b';
  g.lineWidth = 0.12 * r;
  g.beginPath();
  g.moveTo(-0.15 * r, -1.35 * r); g.quadraticCurveTo(-0.6 * r, -1.75 * r, -0.35 * r, -2.05 * r);
  g.moveTo(0.35 * r, -1.35 * r); g.quadraticCurveTo(0.8 * r, -1.75 * r, 0.55 * r, -2.05 * r);
  g.stroke();
  // molten cracks
  crack(g, [-0.5 * r, -0.7 * r, -0.2 * r, -0.35 * r, -0.35 * r, 0.05 * r, -0.1 * r, 0.3 * r]);
  crack(g, [0.4 * r, -0.85 * r, 0.15 * r, -0.4 * r, 0.4 * r, -0.05 * r]);
  crack(g, [-1.05 * r, -0.4 * r, -1.2 * r, 0.1 * r], '#ff5a14', '#ffb46a', 1.1);
  crack(g, [1.05 * r, -0.4 * r, 1.18 * r, 0.15 * r], '#ff5a14', '#ffb46a', 1.1);
  crack(g, [-0.5 * r, 0.5 * r, -0.6 * r, 0.95 * r], '#ff5a14', '#ffb46a', 1);
  // eyes
  g.fillStyle = '#ffe58a';
  g.fillRect(-0.08 * r, -1.2 * r, 0.14 * r, 0.08 * r);
  g.fillRect(0.2 * r, -1.2 * r, 0.14 * r, 0.08 * r);
}

function drawCrawler(g: CanvasRenderingContext2D, r: number) {
  shadow(g, r * 0.55, r * 1.4);
  g.strokeStyle = '#120b0d';
  g.lineWidth = 0.16 * r;
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const ay = -0.25 * r + i * 0.3 * r;
    g.beginPath();
    g.moveTo(sx * 0.4 * r, ay);
    g.lineTo(sx * 1.05 * r, ay - 0.55 * r + i * 0.15 * r);
    g.lineTo(sx * 1.45 * r, ay + 0.5 * r);
    g.stroke();
  }
  g.fillStyle = charcoal(g, -r, -r, r, r);
  g.beginPath(); g.ellipse(0, 0.05 * r, 0.75 * r, 0.6 * r, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#150d0f';
  g.beginPath(); g.ellipse(0, -0.65 * r, 0.42 * r, 0.34 * r, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0b0708';
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 0.35 * r - 0.12 * r, -0.2 * r); g.lineTo(i * 0.4 * r, -0.75 * r); g.lineTo(i * 0.35 * r + 0.12 * r, -0.2 * r); g.fill(); }
  crack(g, [-0.5 * r, 0.1 * r, -0.1 * r, -0.05 * r, 0.15 * r, 0.3 * r, 0.5 * r, 0.15 * r], '#ff3d2e', '#ffb07a', 1.2);
  crack(g, [-0.2 * r, 0.45 * r, 0.1 * r, 0.55 * r], '#ff3d2e', '#ffb07a', 1);
  g.fillStyle = '#ffd36b';
  for (const ex of [-0.18, 0.18, -0.05, 0.05]) g.fillRect(ex * r - 0.04 * r, -0.72 * r + (Math.abs(ex) < 0.1 ? -0.1 * r : 0), 0.09 * r, 0.07 * r);
}

function drawHound(g: CanvasRenderingContext2D, r: number) {
  shadow(g, r * 0.75, r * 1.5);
  g.fillStyle = '#0c0809';
  // legs
  for (const lx of [-0.9, -0.55, 0.55, 0.9]) {
    g.beginPath(); g.moveTo(lx * r - 0.12 * r, 0); g.lineTo(lx * r - 0.05 * r, 0.75 * r); g.lineTo(lx * r + 0.15 * r, 0.75 * r); g.lineTo(lx * r + 0.12 * r, 0); g.fill();
  }
  // tail
  g.strokeStyle = '#120c0d'; g.lineWidth = 0.14 * r;
  g.beginPath(); g.moveTo(-1.1 * r, -0.2 * r); g.quadraticCurveTo(-1.7 * r, -0.5 * r, -1.6 * r, -1.0 * r); g.stroke();
  // body
  g.fillStyle = charcoal(g, -r, -r, r, r * 0.5);
  g.beginPath(); g.ellipse(0, -0.15 * r, 1.15 * r, 0.5 * r, 0, 0, Math.PI * 2); g.fill();
  // head
  g.fillStyle = '#140d0e';
  g.beginPath();
  g.moveTo(0.85 * r, -0.65 * r); g.lineTo(1.55 * r, -0.45 * r); g.lineTo(1.6 * r, -0.2 * r); g.lineTo(1.1 * r, -0.05 * r); g.lineTo(0.8 * r, -0.2 * r);
  g.closePath(); g.fill();
  g.fillStyle = '#ff6a1f';
  g.fillRect(1.15 * r, -0.2 * r, 0.4 * r, 0.05 * r); // glowing maw
  // flaming mane
  for (let i = 0; i < 6; i++) {
    const x = -0.4 * r + i * 0.25 * r;
    g.fillStyle = i % 2 ? '#ff5a14' : '#ffa53a';
    g.globalAlpha = 0.85;
    g.beginPath(); g.moveTo(x - 0.12 * r, -0.55 * r); g.lineTo(x + 0.05 * r, -1.05 * r - (i % 2) * 0.2 * r); g.lineTo(x + 0.14 * r, -0.55 * r); g.fill();
  }
  g.globalAlpha = 1;
  crack(g, [-0.8 * r, -0.2 * r, -0.3 * r, 0.05 * r, 0.1 * r, -0.25 * r, 0.6 * r, 0.0]);
  g.fillStyle = '#ffe58a';
  g.fillRect(1.15 * r, -0.5 * r, 0.12 * r, 0.08 * r);
}

function drawKnight(g: CanvasRenderingContext2D, r: number) {
  shadow(g, r * 1.0, r * 1.0);
  g.fillStyle = '#0a080c';
  g.beginPath();
  g.moveTo(-0.5 * r, 0); g.lineTo(-0.55 * r, 1.0 * r); g.lineTo(-0.15 * r, 1.0 * r); g.lineTo(0, 0.1 * r);
  g.lineTo(0.15 * r, 1.0 * r); g.lineTo(0.55 * r, 1.0 * r); g.lineTo(0.5 * r, 0); g.fill();
  // cape
  g.fillStyle = '#16090c';
  g.beginPath(); g.moveTo(-0.7 * r, -0.9 * r); g.lineTo(0.7 * r, -0.9 * r); g.lineTo(0.9 * r, 0.8 * r); g.lineTo(-0.9 * r, 0.8 * r); g.fill();
  // armour torso
  g.fillStyle = charcoal(g, -r, -r, r, 0);
  g.beginPath(); g.moveTo(-0.6 * r, -0.9 * r); g.lineTo(0.6 * r, -0.9 * r); g.lineTo(0.4 * r, 0.1 * r); g.lineTo(-0.4 * r, 0.1 * r); g.fill();
  // pauldrons with spikes
  for (const sx of [-1, 1]) {
    g.fillStyle = '#231a1d';
    g.beginPath(); g.ellipse(sx * 0.65 * r, -0.85 * r, 0.32 * r, 0.22 * r, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0c0809';
    g.beginPath(); g.moveTo(sx * 0.55 * r, -1.0 * r); g.lineTo(sx * 0.85 * r, -1.45 * r); g.lineTo(sx * 0.8 * r, -0.95 * r); g.fill();
  }
  // helm
  g.fillStyle = '#1b1416';
  g.beginPath(); g.moveTo(-0.25 * r, -0.95 * r); g.lineTo(-0.22 * r, -1.45 * r); g.lineTo(0, -1.6 * r); g.lineTo(0.22 * r, -1.45 * r); g.lineTo(0.25 * r, -0.95 * r); g.fill();
  g.fillStyle = '#ff9f6a';
  g.fillRect(-0.16 * r, -1.3 * r, 0.32 * r, 0.06 * r);
  // greatsword
  g.strokeStyle = '#2b2226'; g.lineWidth = 0.14 * r;
  g.beginPath(); g.moveTo(0.85 * r, -0.4 * r); g.lineTo(1.0 * r, 1.0 * r); g.stroke();
  crack(g, [0.85 * r, -0.3 * r, 0.97 * r, 0.9 * r], '#ff2d55', '#ffc0cb', 1);
  crack(g, [-0.3 * r, -0.7 * r, 0, -0.35 * r, 0.25 * r, -0.65 * r], '#ff2d55', '#ffb0c0', 1.3);
  crack(g, [-0.2 * r, -0.15 * r, 0.15 * r, -0.05 * r], '#ff2d55', '#ffb0c0', 1.1);
}

const DEMON_R: Record<string, number> = { crawler: 14, shadow_fiend: 18, hellhound: 20, void_knight: 26 };
const demonSprites = new Map<string, Sprite>();
function demonSprite(type: string): Sprite {
  let s = demonSprites.get(type);
  if (s) return s;
  const r = DEMON_R[type] || 16;
  const W = r * 4.2;
  const H = r * 4.4;
  const draw = type === 'crawler' ? drawCrawler : type === 'hellhound' ? drawHound : type === 'void_knight' ? drawKnight : drawFiend;
  s = makeSprite(W, H, W / 2, H * 0.58, (g) => draw(g, r));
  demonSprites.set(type, s);
  return s;
}

// ---------------- Boss ----------------
let bossSprite: Sprite | null = null;
function getBoss(): Sprite {
  if (bossSprite) return bossSprite;
  const r = 65;
  bossSprite = makeSprite(r * 5, r * 5, r * 2.5, r * 3.0, (g) => {
    shadow(g, r * 1.4, r * 1.7);
    // legs
    g.fillStyle = '#0b0708';
    g.beginPath(); g.moveTo(-0.75 * r, 0.3 * r); g.lineTo(-1.0 * r, 1.45 * r); g.lineTo(-0.3 * r, 1.45 * r); g.lineTo(-0.15 * r, 0.4 * r); g.fill();
    g.beginPath(); g.moveTo(0.75 * r, 0.3 * r); g.lineTo(1.0 * r, 1.45 * r); g.lineTo(0.3 * r, 1.45 * r); g.lineTo(0.15 * r, 0.4 * r); g.fill();
    // arms (huge)
    for (const sx of [-1, 1]) {
      g.fillStyle = charcoal(g, sx * r, -r, sx * 1.8 * r, r);
      g.beginPath();
      g.moveTo(sx * 0.9 * r, -1.1 * r);
      g.quadraticCurveTo(sx * 1.9 * r, -1.0 * r, sx * 1.75 * r, 0.1 * r);
      g.lineTo(sx * 1.95 * r, 0.75 * r);
      g.lineTo(sx * 1.35 * r, 0.85 * r);
      g.lineTo(sx * 1.25 * r, 0.1 * r);
      g.quadraticCurveTo(sx * 1.0 * r, -0.5 * r, sx * 0.7 * r, -0.6 * r);
      g.closePath();
      g.fill();
      // claws
      g.fillStyle = '#060404';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(sx * (1.4 + k * 0.18) * r, 0.8 * r); g.lineTo(sx * (1.45 + k * 0.2) * r, 1.1 * r); g.lineTo(sx * (1.55 + k * 0.18) * r, 0.8 * r); g.fill(); }
    }
    // torso
    g.fillStyle = charcoal(g, -r, -1.4 * r, r, 0.6 * r);
    g.beginPath();
    g.moveTo(-1.15 * r, -1.0 * r);
    g.quadraticCurveTo(0, -1.65 * r, 1.15 * r, -1.0 * r);
    g.lineTo(0.75 * r, 0.5 * r);
    g.lineTo(-0.75 * r, 0.5 * r);
    g.closePath();
    g.fill();
    // shoulder spikes
    g.fillStyle = '#0d0909';
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const bx = sx * (0.55 + k * 0.17) * r;
      g.beginPath(); g.moveTo(bx - 0.08 * r, -1.15 * r + k * 0.05 * r); g.lineTo(bx + sx * 0.12 * r, -1.65 * r + k * 0.12 * r); g.lineTo(bx + 0.08 * r, -1.1 * r + k * 0.05 * r); g.fill();
    }
    // head + horns
    g.fillStyle = '#140c0d';
    g.beginPath(); g.ellipse(0, -1.4 * r, 0.34 * r, 0.3 * r, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a1c1a'; g.lineWidth = 0.13 * r;
    g.beginPath();
    g.moveTo(-0.25 * r, -1.55 * r); g.bezierCurveTo(-0.8 * r, -1.8 * r, -0.95 * r, -2.2 * r, -0.6 * r, -2.5 * r);
    g.moveTo(0.25 * r, -1.55 * r); g.bezierCurveTo(0.8 * r, -1.8 * r, 0.95 * r, -2.2 * r, 0.6 * r, -2.5 * r);
    g.stroke();
    // molten cracks network
    const W = 1.6;
    crack(g, [-0.8 * r, -0.9 * r, -0.45 * r, -0.55 * r, -0.55 * r, -0.1 * r, -0.25 * r, 0.3 * r], '#ff4410', '#ffd27a', W);
    crack(g, [0.85 * r, -0.85 * r, 0.5 * r, -0.5 * r, 0.6 * r, 0.0, 0.3 * r, 0.35 * r], '#ff4410', '#ffd27a', W);
    crack(g, [-0.3 * r, -1.15 * r, 0, -0.85 * r, 0.3 * r, -1.15 * r], '#ff4410', '#ffd27a', W);
    crack(g, [-1.3 * r, -0.8 * r, -1.55 * r, -0.3 * r, -1.5 * r, 0.3 * r, -1.7 * r, 0.7 * r], '#ff4410', '#ffb46a', W);
    crack(g, [1.3 * r, -0.8 * r, 1.55 * r, -0.3 * r, 1.5 * r, 0.3 * r, 1.7 * r, 0.7 * r], '#ff4410', '#ffb46a', W);
    crack(g, [-0.6 * r, 0.6 * r, -0.65 * r, 1.2 * r], '#ff4410', '#ffb46a', 1.3);
    crack(g, [0.6 * r, 0.6 * r, 0.65 * r, 1.2 * r], '#ff4410', '#ffb46a', 1.3);
    // core socket
    g.fillStyle = '#ff7a1f';
    g.beginPath(); g.arc(0, -0.45 * r, 0.22 * r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff2c2';
    g.beginPath(); g.arc(0, -0.45 * r, 0.1 * r, 0, Math.PI * 2); g.fill();
    // eyes
    g.fillStyle = '#ffec9a';
    g.fillRect(-0.18 * r, -1.45 * r, 0.12 * r, 0.06 * r);
    g.fillRect(0.06 * r, -1.45 * r, 0.12 * r, 0.06 * r);
  });
  return bossSprite;
}

// ---------------- Archmage ----------------
let mageSprite: Sprite | null = null;
let mageCircle: HTMLCanvasElement | null = null;
type MageView = 'front' | 'side' | 'back';
const mageSprites: Partial<Record<MageView, Sprite>> = {};
function getMage(view: MageView = 'front'): Sprite {
  const cached = mageSprites[view];
  if (cached) return cached;
  const sp = makeSprite(80, 100, 40, 66, (g) => {
    const side = view === 'side';
    const back = view === 'back';
    const drawStaff = () => {
      const sx = side ? 10 : 17;
      g.strokeStyle = '#5b4630'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(sx, -42); g.lineTo(sx - 2, 22); g.stroke();
      g.strokeStyle = '#c9a75a'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(sx, -45, 5, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
      g.fillStyle = '#bfefff';
      g.beginPath(); g.moveTo(sx, -54); g.lineTo(sx + 3, -46); g.lineTo(sx, -40); g.lineTo(sx - 3, -46); g.fill();
    };
    // glowing blue-purple crystal wings (matches the Caelen menu portrait)
    const wing = (dir: number, scale: number) => {
      g.save(); g.translate(dir * 4, -18); g.scale(dir * scale, 1);
      const shards: [number, number, number][] = [[34, -30, 7], [36, -14, 6], [30, 2, 5], [22, 14, 4]];
      for (const [tx, ty, w] of shards) {
        const gr = g.createLinearGradient(0, 0, tx, ty);
        gr.addColorStop(0, 'rgba(139,92,246,1)');
        gr.addColorStop(0.6, 'rgba(59,130,246,0.95)');
        gr.addColorStop(1, 'rgba(224,242,254,0.95)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(tx * 0.55, ty * 0.55 - w); g.lineTo(tx, ty); g.lineTo(tx * 0.55 + w * 0.4, ty * 0.55 + w * 0.6); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(30,27,75,0.9)'; g.lineWidth = 0.8; g.stroke();
      }
      g.restore();
    };
    if (side) wing(-1, 0.8); else { wing(-1, 1); wing(1, 1); }
    if (back) drawStaff();
    g.save();
    if (side) g.scale(0.78, 1);
    // long coat, flared hem swept back (floating)
    const coat = g.createLinearGradient(-20, -20, 20, 25);
    coat.addColorStop(0, back ? '#161a2a' : '#1c2236');
    coat.addColorStop(0.5, '#0c101c');
    coat.addColorStop(1, '#070a14');
    g.fillStyle = coat;
    g.beginPath();
    if (side) {
      g.moveTo(-8, -22); g.lineTo(9, -22); g.lineTo(11, 0); g.lineTo(10, 20); g.lineTo(0, 18); g.lineTo(-12, 24); g.lineTo(-24, 20); g.lineTo(-13, 0);
    } else {
      g.moveTo(-9, -22); g.lineTo(9, -22); g.lineTo(13, 0); g.lineTo(20, 22); g.lineTo(6, 19); g.lineTo(0, 23); g.lineTo(-6, 19); g.lineTo(-20, 22); g.lineTo(-13, 0);
    }
    g.closePath(); g.fill();
    g.strokeStyle = '#7dd3fc'; g.lineWidth = 0.9;
    g.beginPath();
    if (back) { g.moveTo(-12, 2); g.lineTo(0, 14); g.lineTo(12, 2); g.moveTo(0, -18); g.lineTo(0, 14); }
    else if (side) { g.moveTo(9, -20); g.lineTo(10, 20); }
    else { g.moveTo(0, -20); g.lineTo(0, 22); g.moveTo(-20, 22); g.lineTo(-6, 19); g.moveTo(20, 22); g.lineTo(6, 19); }
    g.stroke();
    g.strokeStyle = '#a78bfa'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(-10, -8); g.lineTo(10, -8); g.stroke();
    g.fillStyle = '#67e8f9'; g.beginPath(); g.arc(0, -8, 1.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d2740';
    g.beginPath(); g.ellipse(0, -21, 13, 5, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    if (!back) {
      g.strokeStyle = '#151d33'; g.lineWidth = 5;
      g.beginPath();
      if (side) { g.moveTo(2, -19); g.lineTo(10, -6); }
      else { g.moveTo(-10, -19); g.lineTo(-15, -4); g.moveTo(10, -19); g.lineTo(16, -6); }
      g.stroke();
      g.fillStyle = '#e8dccd';
      g.beginPath();
      if (side) g.arc(10, -6, 2.2, 0, Math.PI * 2);
      else { g.arc(-15, -3, 2.2, 0, Math.PI * 2); g.arc(16, -6, 2.2, 0, Math.PI * 2); }
      g.fill();
      drawStaff();
    }
    // head
    const hair = g.createLinearGradient(0, -38, 0, -18);
    hair.addColorStop(0, '#ffffff');
    hair.addColorStop(1, '#c7d2fe');
    if (back) {
      g.fillStyle = hair;
      g.beginPath();
      g.moveTo(-6, -30); g.quadraticCurveTo(-7, -38, 0, -38); g.quadraticCurveTo(7, -38, 6.5, -30);
      g.lineTo(8, -6); g.lineTo(3, -10); g.lineTo(0, -4); g.lineTo(-3, -10); g.lineTo(-8, -6);
      g.closePath(); g.fill();
    } else if (side) {
      g.fillStyle = '#eadfd2';
      g.beginPath(); g.ellipse(1.5, -29, 4, 5.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = hair;
      g.beginPath();
      g.moveTo(4, -32); g.quadraticCurveTo(2, -39, -4, -37); g.quadraticCurveTo(-8, -33, -7, -26);
      g.lineTo(-13, -6); g.lineTo(-5, -14); g.lineTo(-1, -26); g.lineTo(1, -31);
      g.closePath(); g.fill();
      g.fillStyle = '#7dd3fc';
      g.fillRect(3, -29.5, 1.6, 1);
    } else {
      g.fillStyle = '#eadfd2';
      g.beginPath(); g.ellipse(0, -29, 4.5, 5.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = hair;
      g.beginPath();
      g.moveTo(-6, -30); g.quadraticCurveTo(-7, -38, 0, -38); g.quadraticCurveTo(7, -38, 6.5, -30);
      g.lineTo(9, -10); g.lineTo(4, -20); g.lineTo(3, -31); g.lineTo(-2, -32); g.lineTo(-4, -20); g.lineTo(-9, -10);
      g.closePath(); g.fill();
      g.fillStyle = '#7dd3fc';
      g.fillRect(-2.5, -29.5, 1.6, 1); g.fillRect(1, -29.5, 1.6, 1);
    }
  });
  mageSprites[view] = sp;
  return sp;
}


/* ---------- per-hero sprites (match each hero's menu portrait) ---------- */
type Wing = 'none' | 'crystal' | 'feather' | 'fire' | 'ice' | 'lightning';
type Head = 'long' | 'short' | 'hood' | 'antlers' | 'horns';
type Weapon = 'staff' | 'mace' | 'scythe' | 'daggers' | 'fireHands' | 'orbStaff';
interface HeroLook {
  wing: Wing; wingA: string; wingB: string; wingEdge: string;
  head: Head; hair: [string, string]; skin: string;
  coat: [string, string, string]; trim: string; accent: string;
  weapon: Weapon; weaponGlow: string; halo?: string; crown?: string; beard?: string; eyes: string; aura: string;
  rings?: string; dress?: boolean;
}
export const HERO_LOOKS: Record<string, HeroLook> = {
  aurelia: { wing: 'feather', wingA: '#fde68a', wingB: '#f59e0b', wingEdge: '#fff7d6', head: 'long', hair: ['#fde68a', '#d4a017'], skin: '#f1d6bf', coat: ['#f5d778', '#b8860b', '#6b4a0c'], trim: '#fff1b0', accent: '#fbbf24', weapon: 'mace', weaponGlow: '#ff9d2e', halo: '#ffd75a', eyes: '#3b82f6', aura: 'rgba(255,200,80,1)', dress: true },
  lyra: { wing: 'ice', wingA: '#bfdbfe', wingB: '#3b82f6', wingEdge: '#e0f2fe', head: 'long', hair: ['#f8fafc', '#cbd5e1'], skin: '#efe2dc', coat: ['#1e3a8a', '#172554', '#0b1230'], trim: '#93c5fd', accent: '#e0f2fe', weapon: 'orbStaff', weaponGlow: '#7dd3fc', crown: '#bae6fd', eyes: '#38bdf8', aura: 'rgba(120,190,255,1)', dress: true },
  kael: { wing: 'fire', wingA: '#fb923c', wingB: '#b91c1c', wingEdge: '#fde047', head: 'short', hair: ['#3f2a1d', '#1c120c'], skin: '#d6a77f', coat: ['#4a2f22', '#2a1a12', '#120a06'], trim: '#f97316', accent: '#fb923c', weapon: 'fireHands', weaponGlow: '#ff7a1f', beard: '#2a1a10', eyes: '#fb923c', aura: 'rgba(255,120,40,1)' },
  zephyr: { wing: 'lightning', wingA: '#c4b5fd', wingB: '#7c3aed', wingEdge: '#ede9fe', head: 'short', hair: ['#27272a', '#09090b'], skin: '#dcb79a', coat: ['#2e1f4a', '#1a1230', '#0b0716'], trim: '#a78bfa', accent: '#c084fc', weapon: 'fireHands', weaponGlow: '#a855f7', beard: '#18181b', eyes: '#c4b5fd', aura: 'rgba(170,110,255,1)' },
  moros: { wing: 'none', wingA: '', wingB: '', wingEdge: '', head: 'horns', hair: ['#18181b', '#09090b'], skin: '#2a2a2e', coat: ['#27272a', '#141416', '#050506'], trim: '#3f3f46', accent: '#22c55e', weapon: 'scythe', weaponGlow: '#4ade80', eyes: '#4ade80', aura: 'rgba(40,220,120,1)' },
  vane: { wing: 'none', wingA: '', wingB: '', wingEdge: '', head: 'hood', hair: ['#1f1f24', '#0a0a0c'], skin: '#101014', coat: ['#26262c', '#141418', '#060608'], trim: '#3f3f46', accent: '#a855f7', weapon: 'daggers', weaponGlow: '#c084fc', eyes: '#d8b4fe', aura: 'rgba(160,80,255,1)' },
  eldrin: { wing: 'none', wingA: '', wingB: '', wingEdge: '', head: 'antlers', hair: ['#9ca38f', '#5b6150'], skin: '#b89a7c', coat: ['#3f5a2a', '#263a1a', '#14200d'], trim: '#84cc16', accent: '#4ade80', weapon: 'orbStaff', weaponGlow: '#4ade80', beard: '#a8a89a', eyes: '#86efac', aura: 'rgba(80,220,120,1)' },
  ignis: { wing: 'none', wingA: '', wingB: '', wingEdge: '', head: 'horns', hair: ['#2a1410', '#120806'], skin: '#a3352a', coat: ['#5a3524', '#3a2016', '#1a0d08'], trim: '#c2410c', accent: '#f97316', weapon: 'fireHands', weaponGlow: '#ff5a1f', beard: '#2a1410', eyes: '#fde047', aura: 'rgba(255,90,30,1)' },
  nyx: { wing: 'none', wingA: '', wingB: '', wingEdge: '', head: 'long', hair: ['#2a1f3d', '#0f0a1a'], skin: '#e6c9b4', coat: ['#3b2a7a', '#22175a', '#0f0a30'], trim: '#d4a94a', accent: '#60a5fa', weapon: 'orbStaff', weaponGlow: '#c084fc', rings: '#c8963e', crown: '#a78bfa', eyes: '#93c5fd', aura: 'rgba(140,100,255,1)', dress: true },
};

const heroSprites: Record<string, Sprite> = {};
function getHeroSprite(heroId: string, view: MageView): Sprite {
  const L = HERO_LOOKS[heroId];
  if (!L) return getMage(view);
  const key = heroId + ':' + view;
  if (heroSprites[key]) return heroSprites[key];
  const sp = makeSprite(96, 104, 48, 68, (g) => {
    const side = view === 'side', back = view === 'back';
    // ---- wings
    const wingShape = (dir: number, sc: number) => {
      if (L.wing === 'none') return;
      g.save(); g.translate(dir * 4, -18); g.scale(dir * sc, 1);
      const feathers: [number, number, number][] = L.wing === 'feather'
        ? [[40, -26, 6], [42, -12, 6], [38, 2, 5], [30, 12, 5], [20, 18, 4]]
        : [[36, -30, 7], [38, -14, 6], [32, 2, 5], [22, 14, 4]];
      feathers.forEach(([tx, ty, w], i) => {
        const gr = g.createLinearGradient(0, 0, tx, ty);
        gr.addColorStop(0, L.wingB); gr.addColorStop(0.65, L.wingA); gr.addColorStop(1, L.wingEdge);
        g.fillStyle = gr;
        g.beginPath();
        if (L.wing === 'feather') { g.moveTo(0, 0); g.quadraticCurveTo(tx * 0.5, ty - w * 1.5, tx, ty); g.quadraticCurveTo(tx * 0.6, ty + w, 0, 2); }
        else if (L.wing === 'fire') { g.moveTo(0, 0); g.quadraticCurveTo(tx * 0.4, ty * 0.2 - w * 2, tx, ty - 4); g.lineTo(tx * 0.8, ty + 2); g.quadraticCurveTo(tx * 0.5, ty * 0.6 + w, 0, 3); }
        else if (L.wing === 'lightning') { g.moveTo(0, 0); g.lineTo(tx * 0.35, ty * 0.35 - w); g.lineTo(tx * 0.5, ty * 0.5 + 1); g.lineTo(tx * 0.75, ty * 0.75 - w * 0.6); g.lineTo(tx, ty); g.lineTo(tx * 0.6, ty * 0.6 + w * 0.7); g.closePath(); }
        else { g.moveTo(0, 0); g.lineTo(tx * 0.55, ty * 0.55 - w); g.lineTo(tx, ty); g.lineTo(tx * 0.55 + w * 0.4, ty * 0.55 + w * 0.6); g.closePath(); }
        g.fill();
        g.strokeStyle = L.wing === 'feather' ? 'rgba(120,80,10,0.6)' : 'rgba(20,10,40,0.7)'; g.lineWidth = 0.7; g.stroke();
        if (i === 0 && L.wing === 'fire') { g.fillStyle = '#fde047'; g.beginPath(); g.arc(tx, ty - 4, 2, 0, Math.PI * 2); g.fill(); }
      });
      g.restore();
    };
    if (side) wingShape(-1, 0.8); else { wingShape(-1, 1); wingShape(1, 1); }
    if (L.rings && !side) { g.strokeStyle = L.rings; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -26, 22, 0, Math.PI * 2); g.stroke(); g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, -26, 26, 9, -0.5, 0, Math.PI * 2); g.stroke(); }
    if (L.halo) { g.strokeStyle = L.halo; g.lineWidth = 2; g.beginPath(); g.arc(0, back ? -34 : -36, 8, 0, Math.PI * 2); g.stroke(); }
    // ---- weapon (staff-like, drawn behind when back)
    const weapon = () => {
      const sx = side ? 11 : 17;
      if (L.weapon === 'staff' || L.weapon === 'orbStaff' || L.weapon === 'mace' || L.weapon === 'scythe') {
        g.strokeStyle = L.weapon === 'scythe' ? '#1c1c1f' : L.weapon === 'mace' ? '#d4a017' : '#5b4630'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(sx, L.weapon === 'mace' ? -16 : -42); g.lineTo(sx - 2, 22); g.stroke();
        if (L.weapon === 'scythe') { g.fillStyle = '#2b2b30'; g.beginPath(); g.moveTo(sx, -42); g.quadraticCurveTo(sx - 26, -48, sx - 30, -26); g.quadraticCurveTo(sx - 20, -40, sx, -36); g.fill(); g.strokeStyle = L.weaponGlow; g.lineWidth = 0.8; g.stroke(); }
        else if (L.weapon === 'mace') { g.fillStyle = L.weaponGlow; g.beginPath(); g.arc(sx, -19, 4.5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(sx, -19, 2, 0, Math.PI * 2); g.fill(); }
        else { g.fillStyle = L.weaponGlow; g.beginPath(); g.arc(sx, -46, 3.6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx, -46, 1.4, 0, Math.PI * 2); g.fill(); }
      } else if (L.weapon === 'daggers') {
        g.fillStyle = L.weaponGlow;
        for (const dx of side ? [10] : [-16, 16]) { g.beginPath(); g.moveTo(dx, -6); g.lineTo(dx + (dx < 0 ? -2 : 2), 8); g.lineTo(dx, 4); g.closePath(); g.fill(); }
      } else {
        g.fillStyle = L.weaponGlow;
        for (const dx of side ? [11] : [-16, 17]) { g.beginPath(); g.moveTo(dx - 3, -4); g.quadraticCurveTo(dx, -16, dx + 3, -4); g.arc(dx, -4, 3, 0, Math.PI); g.fill(); g.fillStyle = '#fde68a'; g.beginPath(); g.arc(dx, -5, 1.3, 0, Math.PI * 2); g.fill(); g.fillStyle = L.weaponGlow; }
      }
    };
    if (back) weapon();
    // ---- coat / robe
    g.save(); if (side) g.scale(0.78, 1);
    const coat = g.createLinearGradient(-20, -20, 20, 25);
    coat.addColorStop(0, L.coat[0]); coat.addColorStop(0.5, L.coat[1]); coat.addColorStop(1, L.coat[2]);
    g.fillStyle = coat; g.beginPath();
    const hem = L.dress ? 24 : 20;
    if (side) { g.moveTo(-8, -22); g.lineTo(9, -22); g.lineTo(11, 0); g.lineTo(10, hem); g.lineTo(0, hem - 2); g.lineTo(-12, hem + 4); g.lineTo(-24, hem); g.lineTo(-13, 0); }
    else { g.moveTo(-9, -22); g.lineTo(9, -22); g.lineTo(13, 0); g.lineTo(L.dress ? 18 : 20, hem); g.lineTo(6, hem - 3); g.lineTo(0, hem + 1); g.lineTo(-6, hem - 3); g.lineTo(L.dress ? -18 : -20, hem); g.lineTo(-13, 0); }
    g.closePath(); g.fill();
    g.strokeStyle = L.trim; g.lineWidth = 1; g.beginPath();
    if (back) { g.moveTo(-12, 2); g.lineTo(0, 14); g.lineTo(12, 2); }
    else if (side) { g.moveTo(9, -20); g.lineTo(10, hem); }
    else { g.moveTo(0, -20); g.lineTo(0, hem); g.moveTo(-18, hem); g.lineTo(-6, hem - 3); g.moveTo(18, hem); g.lineTo(6, hem - 3); }
    g.stroke();
    g.strokeStyle = L.trim; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-10, -8); g.lineTo(10, -8); g.stroke();
    g.fillStyle = L.accent; g.beginPath(); g.arc(0, -8, 1.7, 0, Math.PI * 2); g.fill();
    g.fillStyle = L.coat[0]; g.beginPath(); g.ellipse(0, -21, 13, 5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = L.trim; g.lineWidth = 0.8; g.stroke();
    g.restore();
    if (!back) {
      g.strokeStyle = L.coat[1]; g.lineWidth = 5; g.beginPath();
      if (side) { g.moveTo(2, -19); g.lineTo(10, -6); } else { g.moveTo(-10, -19); g.lineTo(-15, -4); g.moveTo(10, -19); g.lineTo(16, -6); }
      g.stroke();
      weapon();
    }
    // ---- head
    const hair = g.createLinearGradient(0, -38, 0, -10);
    hair.addColorStop(0, L.hair[0]); hair.addColorStop(1, L.hair[1]);
    const hx = side ? 1.5 : 0;
    if (L.head === 'hood' || L.head === 'horns' && L.skin === '#2a2a2e') {
      g.fillStyle = L.coat[1];
      g.beginPath(); g.moveTo(hx - 8, -18); g.quadraticCurveTo(hx - 9, -40, hx, -40); g.quadraticCurveTo(hx + 9, -40, hx + 8, -18); g.closePath(); g.fill();
      if (!back) { g.fillStyle = '#050507'; g.beginPath(); g.ellipse(hx + (side ? 2 : 0), -28, 4.5, 5.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = L.eyes; if (side) g.fillRect(hx + 3, -29.5, 2, 1.3); else { g.fillRect(hx - 3, -29.5, 2, 1.3); g.fillRect(hx + 1, -29.5, 2, 1.3); } }
    } else {
      if (!back) { g.fillStyle = L.skin; g.beginPath(); g.ellipse(hx, -29, side ? 4 : 4.5, 5.5, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = hair; g.beginPath();
      if (L.head === 'long') {
        if (back) { g.moveTo(-6, -30); g.quadraticCurveTo(-7, -38, 0, -38); g.quadraticCurveTo(7, -38, 6.5, -30); g.lineTo(8, -6); g.lineTo(0, -4); g.lineTo(-8, -6); }
        else if (side) { g.moveTo(4, -32); g.quadraticCurveTo(2, -39, -4, -37); g.quadraticCurveTo(-8, -33, -7, -26); g.lineTo(-13, -6); g.lineTo(-5, -14); g.lineTo(-1, -26); g.lineTo(1, -31); }
        else { g.moveTo(-6, -30); g.quadraticCurveTo(-7, -38, 0, -38); g.quadraticCurveTo(7, -38, 6.5, -30); g.lineTo(9, -10); g.lineTo(4, -20); g.lineTo(3, -31); g.lineTo(-2, -32); g.lineTo(-4, -20); g.lineTo(-9, -10); }
      } else {
        g.moveTo(hx - 5.5, -29); g.quadraticCurveTo(hx - 6, -37, hx, -37); g.quadraticCurveTo(hx + 6, -37, hx + 5.5, -29); g.lineTo(hx + 4, -32); g.lineTo(hx - 4, -32);
      }
      g.closePath(); g.fill();
      if (L.beard && !back) { g.fillStyle = L.beard; g.beginPath(); g.moveTo(hx - 4, -28); g.quadraticCurveTo(hx, L.head === 'antlers' ? -16 : -21, hx + 4, -28); g.lineTo(hx + 3, -26); g.lineTo(hx - 3, -26); g.closePath(); g.fill(); }
      if (!back) { g.fillStyle = L.eyes; if (side) g.fillRect(hx + 1.5, -30, 1.6, 1.1); else { g.fillRect(hx - 2.5, -30, 1.6, 1.1); g.fillRect(hx + 1, -30, 1.6, 1.1); } }
    }
    if (L.head === 'horns') {
      g.fillStyle = L.skin === '#2a2a2e' ? '#3f3f46' : '#3a2a20';
      for (const d of side ? [-1] : [-1, 1]) { g.beginPath(); g.moveTo(hx + d * 4, -34); g.quadraticCurveTo(hx + d * 11, -38, hx + d * 9, -46); g.quadraticCurveTo(hx + d * 7, -39, hx + d * 2, -36); g.fill(); }
    }
    if (L.head === 'antlers') {
      g.strokeStyle = '#6b8e3a'; g.lineWidth = 1.6; g.beginPath();
      for (const d of side ? [-1] : [-1, 1]) { g.moveTo(hx + d * 3, -36); g.lineTo(hx + d * 10, -48); g.moveTo(hx + d * 6, -41); g.lineTo(hx + d * 13, -42); g.moveTo(hx + d * 8, -45); g.lineTo(hx + d * 6, -52); }
      g.stroke();
    }
    if (L.crown) { g.fillStyle = L.crown; g.beginPath(); g.moveTo(hx - 5, -35); g.lineTo(hx - 4, -41); g.lineTo(hx - 1.5, -37); g.lineTo(hx, -43); g.lineTo(hx + 1.5, -37); g.lineTo(hx + 4, -41); g.lineTo(hx + 5, -35); g.closePath(); g.fill(); }
  });
  heroSprites[key] = sp;
  return sp;
}
export function heroAura(heroId: string): string { return HERO_LOOKS[heroId]?.aura ?? 'rgba(60,170,255,1)'; }

/** 8-way direction from an angle (canvas coords, y down). 0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE */
export function dir8(angle: number): number {
  return ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
}
export const DIR8_NAMES = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

function getMageCircle(): HTMLCanvasElement {
  if (mageCircle) return mageCircle;
  const R = 52;
  const [c, g] = makeCanvas((R + 8) * 2 * RES, (R + 8) * 2 * RES);
  g.scale(RES, RES);
  g.translate(R + 8, R + 8);
  const col = 'rgba(80,200,255,1)';
  for (const rr of [R, R - 8, 26]) { g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); glowStroke(g, col, '#e6f8ff', 1); }
  g.beginPath();
  for (let i = 0; i <= 6; i++) { const a = ((i * 2) % 6) / 6 * Math.PI * 2; if (i === 0) g.moveTo(Math.cos(a) * (R - 8), Math.sin(a) * (R - 8)); else g.lineTo(Math.cos(a) * (R - 8), Math.sin(a) * (R - 8)); }
  g.beginPath();
  for (let tri = 0; tri < 2; tri++) for (let i = 0; i <= 3; i++) { const a = (i / 3) * Math.PI * 2 + tri * Math.PI / 3; if (i === 0) g.moveTo(Math.cos(a) * (R - 8), Math.sin(a) * (R - 8)); else g.lineTo(Math.cos(a) * (R - 8), Math.sin(a) * (R - 8)); }
  glowStroke(g, col, '#e6f8ff', 0.9);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = '#e6f8ff'; g.fillRect(Math.cos(a) * (R - 4) - 1, Math.sin(a) * (R - 4) - 1, 2, 2); }
  mageCircle = c;
  return c;
}

// ---------------- Spell sprites ----------------
const projSprites = new Map<string, HTMLCanvasElement>();
function projSprite(kind: string): HTMLCanvasElement {
  let c = projSprites.get(kind);
  if (c) return c;
  const [cv, g] = makeCanvas(96 * RES, 24 * RES);
  g.scale(RES, RES);
  g.translate(70, 12);
  const pal: Record<string, [string, string, string]> = {
    arcane_missile: ['rgba(60,140,255,0)', 'rgba(90,190,255,0.85)', '#ffffff'],
    frost_shard: ['rgba(150,220,255,0)', 'rgba(190,235,255,0.9)', '#ffffff'],
    lightning_arc: ['rgba(120,170,255,0)', 'rgba(170,200,255,0.9)', '#ffffff'],
    meteor: ['rgba(255,80,20,0)', 'rgba(255,140,40,0.9)', '#fff4c0'],
    fire_wave: ['rgba(255,80,20,0)', 'rgba(255,140,40,0.9)', '#fff4c0'],
    combo_singularity: ['rgba(150,60,255,0)', 'rgba(190,120,255,0.9)', '#ffffff'],
    combo_superconductor: ['rgba(80,220,255,0)', 'rgba(120,240,255,0.9)', '#ffffff'],
    combo_blizzard: ['rgba(150,220,255,0)', 'rgba(200,240,255,0.9)', '#ffffff'],
  };
  const [t0, t1, core] = pal[kind] || pal.arcane_missile;
  const trail = g.createLinearGradient(-70, 0, 0, 0);
  trail.addColorStop(0, t0);
  trail.addColorStop(1, t1);
  g.fillStyle = trail;
  g.beginPath(); g.moveTo(-70, 0); g.lineTo(0, -5); g.lineTo(0, 5); g.closePath(); g.fill();
  if (kind === 'meteor' || kind === 'fire_wave' || kind.startsWith('combo_sing')) {
    g.fillStyle = t1; g.beginPath(); g.arc(4, 0, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = core; g.beginPath(); g.arc(5, 0, 4.5, 0, Math.PI * 2); g.fill();
  } else {
    // crystal blade
    g.fillStyle = t1;
    g.beginPath(); g.moveTo(22, 0); g.lineTo(2, -7); g.lineTo(-10, 0); g.lineTo(2, 7); g.closePath(); g.fill();
    g.fillStyle = core;
    g.beginPath(); g.moveTo(20, 0); g.lineTo(3, -3.5); g.lineTo(-6, 0); g.lineTo(3, 3.5); g.closePath(); g.fill();
  }
  projSprites.set(kind, cv);
  return cv;
}

let bladeSprite: HTMLCanvasElement | null = null;
function getBlade(): HTMLCanvasElement {
  if (bladeSprite) return bladeSprite;
  const [c, g] = makeCanvas(200, 40);
  g.translate(0, 20);
  const gr = g.createLinearGradient(0, 0, 200, 0);
  gr.addColorStop(0, 'rgba(56,189,248,0.0)');
  gr.addColorStop(0.25, 'rgba(56,189,248,0.75)');
  gr.addColorStop(0.85, 'rgba(99,140,255,0.65)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(20, 0); g.lineTo(80, -14); g.lineTo(150, -6); g.lineTo(200, 0); g.lineTo(150, 6); g.lineTo(80, 14); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.moveTo(35, 0); g.lineTo(100, -4); g.lineTo(185, 0); g.lineTo(100, 4); g.closePath(); g.fill();
  bladeSprite = c;
  return c;
}

let beamSprite: HTMLCanvasElement | null = null;
function getBeam(): HTMLCanvasElement {
  if (beamSprite) return beamSprite;
  const [c, g] = makeCanvas(64, 512);
  const gr = g.createLinearGradient(0, 512, 0, 0);
  gr.addColorStop(0, 'rgba(120,210,255,0.85)');
  gr.addColorStop(0.3, 'rgba(56,160,255,0.35)');
  gr.addColorStop(1, 'rgba(56,189,248,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(14, 512); g.lineTo(28, 0); g.lineTo(36, 0); g.lineTo(50, 512); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillRect(30, 0, 4, 512);
  beamSprite = c;
  return c;
}

export class VisualRenderer {
  /** Radiant arcane spear wings around the hero (pre-rendered blade, additive). */
  public static renderCelestialSpearWings(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, power: number) {
    const t = performance.now() * 0.001;
    const blade = getBlade();
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 1 + Math.sin(t * 3) * 0.08;
    for (let i = 0; i < 8; i++) {
      const primary = i % 2 === 0;
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8 + t * 0.25 + rotation * 0.05;
      const len = (primary ? 150 : 105) * pulse * power;
      ctx.save();
      ctx.rotate(a);
      ctx.globalAlpha = primary ? 0.55 : 0.38;
      ctx.drawImage(blade, 14, primary ? -10 : -7, len, primary ? 20 : 14);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Floating Archmage. `faceAngle` = smoothed last movement direction (8-way facing),
   * `moveAmt` 0..1 = how much the mage is currently moving (drives lean + cloak trail).
   */
  public static renderArchmage(
    ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, isDashing: boolean,
    faceAngle: number = Math.PI / 2, moveAmt: number = 0, heroId: string = 'caelen',
  ) {
    const t = performance.now() * 0.001;
    const d = dir8(faceAngle);
    const view: MageView = d === 2 || d === 1 || d === 3 ? 'front' : d === 0 || d === 4 ? 'side' : 'back';
    const flip = d === 4 || d === 3 || d === 5 ? -1 : 1; // west-ish faces left
    const yaw = d === 1 || d === 3 || d === 5 || d === 7 ? 0.9 : 1; // diagonals slightly turned
    const s = getHeroSprite(heroId, view);
    const circle = getMageCircle();
    const lift = 16 + Math.sin(t * 2.6) * 5; // hover height
    const fx = Math.cos(faceAngle), fy = Math.sin(faceAngle);
    const lean = fx * 0.2 * moveAmt; // bank into horizontal movement
    ctx.save();
    ctx.translate(x, y);
    // soft ground shadow (shrinks as the mage rises)
    const sh = 1 - (lift - 11) / 30;
    ctx.fillStyle = `rgba(0,0,0,${0.42 * sh})`;
    ctx.beginPath();
    ctx.ellipse(0, 22, 20 * sh, 6.5 * sh, 0, 0, Math.PI * 2);
    ctx.fill();
    // runic ground circle + aura
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, heroAura(heroId), 0, 6, 90, 0.5 + Math.sin(t * 2.5) * 0.12);
    ctx.save();
    ctx.scale(1, 0.55);
    ctx.translate(0, 38);
    ctx.rotate(t * 0.6);
    const cr = circle.width / RES / 2;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(circle, -cr, -cr, cr * 2, cr * 2);
    ctx.restore();
    ctx.globalAlpha = 1;
    // cloak / wing trail behind the mage while moving
    if (moveAmt > 0.05 || isDashing) {
      const n = isDashing ? 4 : 3;
      for (let k = n; k >= 1; k--) {
        ctx.save();
        ctx.globalAlpha = (isDashing ? 0.22 : 0.13) * moveAmt * (n + 1 - k) / n + (isDashing ? 0.05 : 0);
        ctx.translate(-fx * k * 11, -fy * k * 11 - lift + Math.sin(t * 2.6 - k * 0.5) * 2);
        ctx.rotate(lean);
        ctx.scale(flip * yaw, 1);
        blit(ctx, s, s.frozen);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    // the mage itself, floating
    ctx.save();
    ctx.translate(0, -lift);
    ctx.rotate(lean);
    ctx.scale(flip * yaw, 1);
    blit(ctx, s);
    ctx.restore();
    // staff crystal + hand glow
    ctx.globalCompositeOperation = 'lighter';
    const staffX = (view === 'side' ? 10 * 0.95 : 17) * flip * yaw;
    const cx = staffX * Math.cos(lean) + 47 * Math.sin(lean);
    drawGlow(ctx, 'rgba(140,220,255,1)', cx, -47 - lift, 22 + Math.sin(t * 6) * 3, view === 'back' ? 0.6 : 0.95);
    drawGlow(ctx, 'rgba(120,200,255,1)', 0, -10 - lift, 46, 0.22);
    ctx.restore();
  }

  public static renderVoidColossus(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number, isHit: boolean) {
    const t = performance.now() * 0.001;
    const s = getBoss();
    const breathe = Math.sin(t * 1.6);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 'rgba(255,50,20,1)', 0, -40, 230, 0.4 + breathe * 0.06);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.scale(1 + breathe * 0.012, 1 - breathe * 0.012);
    blit(ctx, s);
    if (isHit) { ctx.globalAlpha = 0.6; blit(ctx, s, s.hit); ctx.globalAlpha = 1; }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    // glowing core + eye glow
    drawGlow(ctx, 'rgba(255,120,30,1)', 0, -29, 34 + breathe * 5, 0.95);
    drawGlow(ctx, 'rgba(255,220,120,1)', 0, -29, 14, 1);
    drawGlow(ctx, 'rgba(255,180,80,1)', 0, -92, 16, 0.7);
    // ember particles rising off the body (deterministic, no allocation)
    ctx.fillStyle = '#ffa040';
    for (let i = 0; i < 18; i++) {
      const ph = (t * (0.35 + (i % 5) * 0.07) + i * 0.137) % 1;
      const ex = Math.sin(i * 12.9898) * 90 + Math.sin(t + i) * 8;
      const ey = -20 - ph * 150 + Math.cos(i * 4.1) * 30;
      ctx.globalAlpha = (1 - ph) * 0.9;
      ctx.fillRect(ex, ey, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // health bar
    const bw = 150;
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(-bw / 2 - 2, -190, bw + 4, 10);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-bw / 2, -188, bw, 6);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-bw / 2, -188, bw * pct, 6);
    ctx.fillStyle = 'rgba(255,200,150,0.6)';
    ctx.fillRect(-bw / 2, -188, bw * pct, 1.5);
    ctx.restore();
  }

  public static renderDemonMinion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    type: EnemyType,
    isFrozen: boolean,
    isHit: boolean,
    facing = 1,
    hp = 1,
    maxHp = 1,
    phase = 0
  ) {
    const s = demonSprite(type);
    const t = performance.now() * 0.001;
    const r = DEMON_R[type] || 16;
    const step = Math.sin(t * 9 + phase);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const auraCol = type === 'void_knight' ? 'rgba(255,40,90,1)' : 'rgba(255,60,20,1)';
    drawGlow(ctx, auraCol, 0, -r * 0.3, r * 2.4, 0.28 + 0.06 * Math.sin(t * 5 + phase));
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(0, isFrozen ? 0 : step * 1.2);
    ctx.scale(facing * (1 + (isFrozen ? 0 : step * 0.03)), 1 - (isFrozen ? 0 : step * 0.03));
    blit(ctx, s);
    if (isFrozen) blit(ctx, s, s.frozen);
    if (isHit) blit(ctx, s, s.hit);
    ctx.restore();
    // ember eyes glow
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 'rgba(255,190,80,1)', facing * r * 0.1, -r * (type === 'hellhound' ? 0.4 : type === 'crawler' ? 0.7 : 1.2), r * 0.45, 0.8);
    ctx.globalCompositeOperation = 'source-over';
    if (hp < maxHp) {
      const bw = r * 1.8;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-bw / 2 - 1, -r * 2.1 - 1, bw + 2, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-bw / 2, -r * 2.1, bw * Math.max(0, hp / maxHp), 2);
    }
    ctx.restore();
  }

  /** Vertical arcane light beam rising from an obelisk crystal. */
  public static renderObeliskBeams(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const t = performance.now() * 0.001;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.55 + Math.sin(t * 4) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.drawImage(getBeam(), -20 * (0.9 + pulse * 0.2), -520, 40 * (0.9 + pulse * 0.2), 520);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  public static renderProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
    const img = projSprite(p.type);
    const ang = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, p.type === 'meteor' || p.type === 'fire_wave' ? 'rgba(255,120,30,1)' : 'rgba(80,180,255,1)', 0, 0, 26, 0.75);
    ctx.rotate(ang);
    ctx.drawImage(img, -70, -12, 96, 24);
    ctx.restore();
  }
}
